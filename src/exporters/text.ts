/**
 * Plain Text Exporter
 * Exports book content as plain text with optional chapter headers
 */

import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import type { ContentChunk, BookMetadata } from '../types.js'
import type { Exporter, TextExportOptions, ExportResult } from './types.js'
import { ExportProcessingError } from './types.js'
import { getChapterForPage } from '../metadata/parser.js'

/**
 * Plain text exporter
 */
export class TextExporter implements Exporter {
  readonly format = 'text' as const

  /**
   * Export content as plain text
   */
  async export(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: TextExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      // Ensure output directory exists
      await mkdir(options.outputDir, { recursive: true })

      // Build text content
      const textContent = this.buildTextContent(content, metadata, options)

      // Determine output filename
      const filename =
        options.filename || this.sanitizeFilename(options.bookTitle)
      const filePath = join(options.outputDir, `${filename}.txt`)

      // Write to file
      await writeFile(filePath, textContent, 'utf-8')

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
   * Text export is always available
   */
  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Build text content from chunks
   */
  private buildTextContent(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: TextExportOptions
  ): string {
    const lines: string[] = []
    const lineSeparator = options.lineSeparator || '\n'

    // Add metadata header if requested
    if (options.includeMetadata && metadata.meta) {
      lines.push('='.repeat(80))
      lines.push(metadata.meta.title)
      if (metadata.meta.authorList && metadata.meta.authorList.length > 0) {
        lines.push(`by ${metadata.meta.authorList.join(', ')}`)
      }
      if (metadata.meta.publisher) {
        lines.push(`Published by ${metadata.meta.publisher}`)
      }
      lines.push('='.repeat(80))
      lines.push('')
    }

    // Track current chapter
    let currentChapter: string | null = null

    // Process each content chunk
    for (const chunk of content) {
      // Add chapter header if needed
      if (options.includeChapterHeaders && metadata.toc.length > 0) {
        const chapter = getChapterForPage(chunk.page, metadata.toc)
        if (chapter && chapter.label !== currentChapter) {
          currentChapter = chapter.label
          lines.push('')
          lines.push('─'.repeat(80))
          lines.push(currentChapter)
          lines.push('─'.repeat(80))
          lines.push('')
        }
      }

      // Add page number if requested
      if (options.includePageNumbers) {
        lines.push(`[Page ${chunk.page}]`)
        lines.push('')
      }

      // Add the text content
      if (chunk.text && chunk.text.trim().length > 0) {
        lines.push(chunk.text.trim())
        lines.push('')
      }
    }

    return lines.join(lineSeparator)
  }

  /**
   * Sanitize filename for file system
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^[-_]+|[-_]+$/g, '') // Trim dashes/underscores
      .slice(0, 200) // Limit length
  }
}
