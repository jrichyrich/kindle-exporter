/**
 * PDF Exporter
 * Exports book content as PDF with TOC bookmarks and optional text layer
 */

import { createWriteStream } from 'fs'
import { mkdir, stat } from 'fs/promises'
import { join } from 'path'
import PDFDocument from 'pdfkit'
import type { ContentChunk, BookMetadata } from '../types.js'
import type { Exporter, PdfExportOptions, ExportResult } from './types.js'
import { ExportProcessingError } from './types.js'
import { formatTocForPdf } from '../metadata/parser.js'

/**
 * PDF page sizes in points (72 points = 1 inch)
 */
const PAGE_SIZES = {
  Letter: [612, 792], // 8.5" x 11"
  A4: [595, 842], // 210mm x 297mm
  Legal: [612, 1008] // 8.5" x 14"
} as const

/**
 * PDF exporter with TOC bookmarks
 */
export class PdfExporter implements Exporter {
  readonly format = 'pdf' as const

  /**
   * Export content as PDF
   */
  async export(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: PdfExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      // Ensure output directory exists
      await mkdir(options.outputDir, { recursive: true })

      // Determine output filename
      const filename =
        options.filename || this.sanitizeFilename(options.bookTitle)
      const filePath = join(options.outputDir, `${filename}.pdf`)

      // Create PDF
      await this.createPdf(content, metadata, options, filePath)

      // Get file size
      const stats = await stat(filePath)

      return {
        format: this.format,
        filePath,
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

  /**
   * PDF export is always available (PDFKit is a dependency)
   */
  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Get dependencies
   */
  getDependencies(): string[] {
    return ['pdfkit']
  }

  /**
   * Create PDF file
   */
  private async createPdf(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: PdfExportOptions,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const pageSize = options.pageSize || 'Letter'
        const [width, height] = PAGE_SIZES[pageSize]
        const margins = options.margins || {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }

        // Create PDF document
        const doc = new PDFDocument({
          size: [width, height],
          margins,
          autoFirstPage: false,
          info: {
            Title: metadata.meta.title,
            Author: metadata.meta.authorList?.join(', '),
            Creator: 'Kindle Exporter',
            Producer: 'Kindle Exporter'
          }
        })

        // Create write stream
        const stream = createWriteStream(outputPath)
        doc.pipe(stream)

        // Add cover page if we have metadata
        if (options.includeMetadata && metadata.meta) {
          this.addCoverPage(doc, metadata, width, height)
        }

        // Add content pages
        for (let i = 0; i < content.length; i++) {
          const chunk = content[i]
          if (chunk) {
            this.addContentPage(doc, chunk, options, width, height, margins)
          }
        }

        // Add TOC bookmarks if requested
        if (options.includeToc && metadata.toc.length > 0) {
          this.addTocBookmarks(doc, metadata)
        }

        // Finalize PDF
        doc.end()

        stream.on('finish', () => resolve())
        stream.on('error', (error) => reject(error))
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Add cover page with metadata
   */
  private addCoverPage(
    doc: PDFKit.PDFDocument,
    metadata: BookMetadata,
    width: number,
    height: number
  ): void {
    doc.addPage({ size: [width, height] })

    let y = height / 3

    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(metadata.meta.title, 50, y, {
        width: width - 100,
        align: 'center'
      })

    y += 60

    // Author
    if (metadata.meta.authorList && metadata.meta.authorList.length > 0) {
      doc
        .fontSize(16)
        .font('Helvetica')
        .text(`by ${metadata.meta.authorList.join(', ')}`, 50, y, {
          width: width - 100,
          align: 'center'
        })
      y += 40
    }

    // Publisher
    if (metadata.meta.publisher) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(metadata.meta.publisher, 50, y, {
          width: width - 100,
          align: 'center'
        })
    }
  }

  /**
   * Add content page with screenshot
   */
  private addContentPage(
    doc: PDFKit.PDFDocument,
    chunk: ContentChunk,
    options: PdfExportOptions,
    width: number,
    height: number,
    margins: { top: number; bottom: number; left: number; right: number }
  ): void {
    doc.addPage({ size: [width, height] })

    const contentWidth = width - margins.left - margins.right
    const contentHeight = height - margins.top - margins.bottom

    // Add screenshot image
    if (chunk.screenshot) {
      try {
        doc.image(chunk.screenshot, margins.left, margins.top, {
          fit: [contentWidth, contentHeight],
          align: 'center',
          valign: 'center'
        })
      } catch (error) {
        console.warn(`Failed to add image ${chunk.screenshot}:`, error)
      }
    }

    // Add text layer if requested (for searchability)
    if (options.includeTextLayer && chunk.text) {
      // Add invisible text layer over the image
      doc
        .fontSize(1) // Very small, nearly invisible
        .fillColor('#FFFFFF', 0.01) // Nearly transparent
        .text(chunk.text, margins.left, margins.top, {
          width: contentWidth,
          height: contentHeight,
          lineBreak: false
        })
    }

    // Add page number footer
    doc
      .fontSize(10)
      .fillColor('#000000')
      .text(`Page ${chunk.page}`, margins.left, height - margins.bottom + 10, {
        width: contentWidth,
        align: 'center'
      })
  }

  /**
   * Add TOC bookmarks
   */
  private addTocBookmarks(
    doc: PDFKit.PDFDocument,
    metadata: BookMetadata
  ): void {
    const bookmarks = formatTocForPdf(metadata.toc)

    for (const bookmark of bookmarks) {
      // Add outline entry (bookmark)
      // Note: PDFKit API varies - this is a simplified implementation
      // In practice, we'd need to track page references differently
      // PDFKit uses 0-indexed pages, but our pages are 1-indexed
      void (bookmark.page - 1) // For future use with page references

      doc.outline.addItem(bookmark.title, {
        expanded: bookmark.level === 0
      })
    }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      .slice(0, 200)
  }
}
