/**
 * Searchable PDF Exporter
 * Creates PDFs with visible screenshot images and invisible OCR text layer
 * This allows the PDF to be searchable and text-selectable while preserving visual fidelity
 */

import PDFDocument from 'pdfkit'
import { createWriteStream, statSync, readFileSync } from 'fs'
import sizeOf from 'image-size'
import { join } from 'path'
import type { Exporter, ExportOptions, ExportResult } from './types.js'
import type { ContentChunk, BookMetadata } from '../types.js'
import { ExportProcessingError } from './types.js'

export class SearchablePdfExporter implements Exporter {
  readonly format = 'pdf-ocr' as const

  async export(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      // Build output path
      const filename = options.filename || options.bookTitle
      const outputPath = join(options.outputDir, `${filename}.pdf`)

      // Create PDF
      await this.createPdf(content, metadata, outputPath, options)

      // Get file size
      const stats = statSync(outputPath)

      return {
        format: this.format,
        filePath: outputPath,
        fileSize: stats.size,
        pageCount: content.length,
        duration: Date.now() - startTime,
        success: true
      }
    } catch (error) {
      throw new ExportProcessingError(
        this.format,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  private async createPdf(
    content: ContentChunk[],
    metadata: BookMetadata,
    outputPath: string,
    options: ExportOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          autoFirstPage: false,
          info: {
            Title: metadata.meta.title || options.bookTitle,
            Author: metadata.meta.authorList?.[0] || 'Unknown',
            Subject: 'Kindle Book Export',
            Keywords: 'kindle, ebook, ocr, searchable',
            Creator: 'Kindle Exporter'
          }
        })

        // Pipe to file
        const stream = createWriteStream(outputPath)
        doc.pipe(stream)

        // Add each page
        for (const chunk of content) {
          this.addSearchablePage(doc, chunk)
        }

        // Finalize PDF
        doc.end()

        stream.on('finish', () => resolve())
        stream.on('error', reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Add a searchable page to the PDF
   * Places the screenshot image with invisible OCR text overlay
   */
  private addSearchablePage(
    doc: typeof PDFDocument,
    chunk: ContentChunk
  ): void {
    // Get image dimensions by reading file as buffer
    const imageBuffer = readFileSync(chunk.screenshot)
    const dimensions = sizeOf(imageBuffer)
    if (!dimensions.width || !dimensions.height) {
      throw new Error(`Could not determine dimensions for ${chunk.screenshot}`)
    }

    // Add page with exact image dimensions
    doc.addPage({
      size: [dimensions.width, dimensions.height],
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    })

    // Place screenshot image as visible layer (fills entire page)
    doc.image(chunk.screenshot, 0, 0, {
      width: dimensions.width,
      height: dimensions.height
    })

    // Add invisible OCR text layer on top
    if (chunk.text && chunk.text.trim().length > 0) {
      // Use positioned text if word positions are available (Tesseract hOCR)
      if (chunk.wordPositions && chunk.wordPositions.length > 0) {
        this.addPositionedTextLayer(doc, chunk.wordPositions)
      } else {
        // Fall back to simple text overlay (LiveText, Vision Model)
        this.addInvisibleTextLayer(
          doc,
          chunk.text,
          dimensions.width,
          dimensions.height
        )
      }
    }
  }

  /**
   * Add invisible text layer for searchability
   * Text is overlaid on the image but rendered invisibly
   */
  private addInvisibleTextLayer(
    doc: typeof PDFDocument,
    text: string,
    pageWidth: number,
    pageHeight: number
  ): void {
    // Save graphics state
    doc.save()

    // Set text rendering mode to invisible (mode 3)
    // This makes text searchable but not visible
    doc.addContent('3 Tr') // Text rendering mode: invisible

    // Calculate appropriate font size
    // We want to fit the text naturally on the page
    const fontSize = this.calculateFontSize(text, pageWidth, pageHeight)

    // Set font and size
    doc.fontSize(fontSize)

    // Position text at top-left with small margin
    const margin = 10
    const textWidth = pageWidth - 2 * margin

    // Add text as invisible layer
    // PDFKit will handle line wrapping automatically
    doc.text(text, margin, margin, {
      width: textWidth,
      align: 'left',
      lineGap: 2
    })

    // Restore graphics state
    doc.restore()
  }

  /**
   * Add positioned invisible text layer using word bounding boxes
   * Places each word at its exact location in the image (from hOCR)
   */
  private addPositionedTextLayer(
    doc: typeof PDFDocument,
    wordPositions: import('../types.js').WordPosition[]
  ): void {
    // Save graphics state
    doc.save()

    // Set text rendering mode to invisible (mode 3)
    doc.addContent('3 Tr')

    // Position each word at its exact coordinates
    for (const word of wordPositions) {
      const { text, bbox } = word

      // Calculate word dimensions
      const wordWidth = bbox.x1 - bbox.x0
      const wordHeight = bbox.y1 - bbox.y0

      // Estimate font size based on word height
      // Typical font height is ~1.2x the font size
      const fontSize = Math.max(6, Math.min(72, wordHeight * 0.85))

      // Set font size for this word
      doc.fontSize(fontSize)

      // Position the word at its exact location
      // We use lineBreak: false to prevent automatic line breaks
      doc.text(text, bbox.x0, bbox.y0, {
        width: wordWidth,
        height: wordHeight,
        lineBreak: false,
        continued: false
      })
    }

    // Restore graphics state
    doc.restore()
  }

  /**
   * Calculate appropriate font size to fit text on page
   * Ensures all OCR text is placed on the page for searchability
   */
  private calculateFontSize(
    text: string,
    pageWidth: number,
    pageHeight: number
  ): number {
    // Estimate characters per line based on page width
    // Typical character width is ~0.5 * fontSize
    const targetCharsPerLine = 80
    const margin = 10
    const availableWidth = pageWidth - 2 * margin

    // Calculate font size: availableWidth / (targetCharsPerLine * charWidthFactor)
    const charWidthFactor = 0.5
    let fontSize = availableWidth / (targetCharsPerLine * charWidthFactor)

    // Estimate how many lines we need
    const totalChars = text.length
    const estimatedLines = Math.ceil(totalChars / targetCharsPerLine)

    // Calculate required height
    const lineHeightFactor = 1.2 // Line height is typically 1.2x font size
    const requiredHeight = estimatedLines * fontSize * lineHeightFactor

    // If text doesn't fit, reduce font size
    const availableHeight = pageHeight - 2 * margin
    if (requiredHeight > availableHeight) {
      fontSize = fontSize * (availableHeight / requiredHeight)
    }

    // Clamp font size to reasonable range (4-14pt)
    fontSize = Math.max(4, Math.min(14, fontSize))

    return fontSize
  }
}

/**
 * Factory function
 */
export function createSearchablePdfExporter(): Exporter {
  return new SearchablePdfExporter()
}
