/**
 * Markdown Exporter
 * Exports book content as Markdown with chapter structure and front matter
 */

import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import type { ContentChunk, BookMetadata } from '../types.js'
import type { Exporter, MarkdownExportOptions, ExportResult } from './types.js'
import { ExportProcessingError } from './types.js'
import { getChapterForPage } from '../metadata/parser.js'

/**
 * Markdown exporter
 */
export class MarkdownExporter implements Exporter {
  readonly format = 'markdown' as const

  /**
   * Export content as Markdown
   */
  async export(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: MarkdownExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      // Ensure output directory exists
      await mkdir(options.outputDir, { recursive: true })

      // Build markdown content
      const markdownContent = this.buildMarkdownContent(
        content,
        metadata,
        options
      )

      // Determine output filename
      const filename =
        options.filename || this.sanitizeFilename(options.bookTitle)
      const filePath = join(options.outputDir, `${filename}.md`)

      // Write to file
      await writeFile(filePath, markdownContent, 'utf-8')

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
   * Markdown export is always available
   */
  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Build markdown content
   */
  private buildMarkdownContent(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: MarkdownExportOptions
  ): string {
    const lines: string[] = []
    const chapterLevel = options.chapterHeadingLevel || 1
    const chapterPrefix = '#'.repeat(chapterLevel)

    // Add YAML front matter if requested
    if (options.includeFrontMatter && metadata.meta) {
      lines.push('---')
      lines.push(`title: "${this.escapeYaml(metadata.meta.title)}"`)

      if (metadata.meta.authorList && metadata.meta.authorList.length > 0) {
        const firstAuthor = metadata.meta.authorList[0]
        if (metadata.meta.authorList.length === 1 && firstAuthor) {
          lines.push(`author: "${this.escapeYaml(firstAuthor)}"`)
        } else {
          lines.push('authors:')
          for (const author of metadata.meta.authorList) {
            lines.push(`  - "${this.escapeYaml(author)}"`)
          }
        }
      }

      if (metadata.meta.publisher) {
        lines.push(`publisher: "${this.escapeYaml(metadata.meta.publisher)}"`)
      }

      if (metadata.meta.releaseDate) {
        lines.push(`date: "${metadata.meta.releaseDate}"`)
      }

      if (metadata.meta.language) {
        lines.push(`language: "${metadata.meta.language}"`)
      }

      if (metadata.meta.asin) {
        lines.push(`asin: "${metadata.meta.asin}"`)
      }

      lines.push('---')
      lines.push('')
    }

    // Add title header
    lines.push(`# ${metadata.meta.title}`)
    lines.push('')

    if (metadata.meta.authorList && metadata.meta.authorList.length > 0) {
      lines.push(`*by ${metadata.meta.authorList.join(', ')}*`)
      lines.push('')
    }

    // Add table of contents if requested
    if (options.includeToc && metadata.toc.length > 0) {
      lines.push('## Table of Contents')
      lines.push('')

      for (const item of metadata.toc) {
        const indent = '  '.repeat(item.depth)
        const pageInfo = item.page ? ` (Page ${item.page})` : ''
        lines.push(`${indent}- ${item.label}${pageInfo}`)
      }

      lines.push('')
      lines.push('---')
      lines.push('')
    }

    // Track current chapter
    let currentChapter: string | null = null

    // Process each content chunk
    for (const chunk of content) {
      // Add chapter header if we've moved to a new chapter
      const chapter = getChapterForPage(chunk.page, metadata.toc)
      if (chapter && chapter.label !== currentChapter) {
        currentChapter = chapter.label

        lines.push('')
        lines.push(`${chapterPrefix} ${currentChapter}`)
        lines.push('')
      }

      // Add the text content
      if (chunk.text && chunk.text.trim().length > 0) {
        lines.push(chunk.text.trim())
        lines.push('')
      }

      // Add page break if requested
      if (options.includePageBreaks) {
        lines.push(`---`)
        lines.push(`*Page ${chunk.page}*`)
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  /**
   * Escape YAML special characters
   */
  private escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"')
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
