/**
 * EPUB Exporter
 * Exports book content as EPUB using Calibre's ebook-convert
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { mkdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import type { ContentChunk, BookMetadata } from '../types.js'
import type { Exporter, EpubExportOptions, ExportResult } from './types.js'
import { ExportProcessingError, ExporterNotAvailableError } from './types.js'
import { PdfExporter } from './pdf.js'

const execFileAsync = promisify(execFile)

/**
 * EPUB exporter using Calibre
 */
export class EpubExporter implements Exporter {
  readonly format = 'epub' as const
  private calibrePath?: string

  /**
   * Export content as EPUB
   */
  async export(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: EpubExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      // Check if Calibre is available
      if (!(await this.isAvailable())) {
        throw new ExporterNotAvailableError(
          'epub',
          'Calibre ebook-convert not found. Install from https://calibre-ebook.com/'
        )
      }

      // Ensure output directory exists
      await mkdir(options.outputDir, { recursive: true })

      // Determine filenames
      const filename =
        options.filename || this.sanitizeFilename(options.bookTitle)
      const pdfPath = join(options.outputDir, `${filename}_temp.pdf`)
      const epubPath = join(options.outputDir, `${filename}.epub`)

      // Step 1: Create a temporary PDF
      const pdfExporter = new PdfExporter()
      await pdfExporter.export(content, metadata, {
        ...options,
        filename: `${filename}_temp`,
        includeToc: true,
        includeTextLayer: true
      })

      // Step 2: Convert PDF to EPUB using Calibre
      await this.convertToEpub(pdfPath, epubPath, metadata, options)

      // Step 3: Clean up temporary PDF
      await unlink(pdfPath).catch(() => {
        /* ignore cleanup errors */
      })

      // Get file size
      const stats = await stat(epubPath)

      return {
        format: this.format,
        filePath: epubPath,
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
   * Check if Calibre is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.calibrePath) {
      return true
    }

    try {
      const calibre = await this.findCalibre()
      this.calibrePath = calibre
      return true
    } catch {
      return false
    }
  }

  /**
   * Get dependencies
   */
  getDependencies(): string[] {
    return ['Calibre (ebook-convert)']
  }

  /**
   * Find Calibre ebook-convert executable
   */
  private async findCalibre(): Promise<string> {
    const possiblePaths = [
      'ebook-convert', // In PATH
      '/usr/bin/ebook-convert', // Linux
      '/usr/local/bin/ebook-convert', // macOS Homebrew
      '/Applications/calibre.app/Contents/MacOS/ebook-convert', // macOS app
      'C:\\Program Files\\Calibre2\\ebook-convert.exe', // Windows
      'C:\\Program Files (x86)\\Calibre2\\ebook-convert.exe' // Windows 32-bit
    ]

    for (const path of possiblePaths) {
      try {
        await execFileAsync(path, ['--version'])
        return path
      } catch {
        // Try next path
      }
    }

    throw new Error('Calibre ebook-convert not found')
  }

  /**
   * Convert PDF to EPUB using Calibre
   */
  private async convertToEpub(
    pdfPath: string,
    epubPath: string,
    metadata: BookMetadata,
    options: EpubExportOptions
  ): Promise<void> {
    const calibre = this.calibrePath || (await this.findCalibre())

    const args = [
      pdfPath,
      epubPath,
      '--input-profile=default',
      '--output-profile=tablet'
    ]

    // Add metadata
    if (metadata.meta.title) {
      args.push('--title', metadata.meta.title)
    }

    if (options.metadata?.author || metadata.meta.authorList?.[0]) {
      const author = options.metadata?.author || metadata.meta.authorList?.[0]
      if (author) {
        args.push('--authors', author)
      }
    }

    if (options.metadata?.publisher || metadata.meta.publisher) {
      const publisher = options.metadata?.publisher || metadata.meta.publisher
      if (publisher) {
        args.push('--publisher', publisher)
      }
    }

    if (metadata.meta.language || options.metadata?.language) {
      const lang = metadata.meta.language || options.metadata?.language
      if (lang) {
        args.push('--language', lang)
      }
    }

    if (options.metadata?.isbn) {
      args.push('--isbn', options.metadata.isbn)
    }

    // Add cover if provided
    if (options.coverImage) {
      args.push('--cover', options.coverImage)
    }

    // Run conversion
    try {
      await execFileAsync(calibre, args, {
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      })
    } catch (error) {
      throw new Error(
        `Calibre conversion failed: ${error instanceof Error ? error.message : String(error)}`
      )
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
