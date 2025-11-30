/**
 * Exporter Types and Interfaces
 * Defines the contract that all exporters must implement
 */

import type { ExportFormat, BookMetadata, ContentChunk } from '../types.js'

/**
 * Export options common to all formats
 */
export interface ExportOptions {
  /** Output directory for exported files */
  outputDir: string
  /** Book title for filename */
  bookTitle: string
  /** Include metadata in export */
  includeMetadata?: boolean
  /** Custom filename (without extension) */
  filename?: string
}

/**
 * Text export specific options
 */
export interface TextExportOptions extends ExportOptions {
  /** Include page numbers in text */
  includePageNumbers?: boolean
  /** Include chapter headers */
  includeChapterHeaders?: boolean
  /** Line separator */
  lineSeparator?: string
}

/**
 * PDF export specific options
 */
export interface PdfExportOptions extends ExportOptions {
  /** Include table of contents bookmarks */
  includeToc?: boolean
  /** Include OCR text layer (searchable) */
  includeTextLayer?: boolean
  /** Page size (default: Letter) */
  pageSize?: 'Letter' | 'A4' | 'Legal'
  /** Margins in points */
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  /** Image quality (0-100) */
  imageQuality?: number
}

/**
 * Markdown export specific options
 */
export interface MarkdownExportOptions extends ExportOptions {
  /** Include front matter (YAML) */
  includeFrontMatter?: boolean
  /** Include table of contents */
  includeToc?: boolean
  /** Heading level for chapters (1-6) */
  chapterHeadingLevel?: number
  /** Include page breaks */
  includePageBreaks?: boolean
}

/**
 * EPUB export specific options
 */
export interface EpubExportOptions extends ExportOptions {
  /** Cover image path */
  coverImage?: string
  /** Calibre executable path */
  calibrePath?: string
  /** Metadata for EPUB */
  metadata?: {
    author?: string
    publisher?: string
    language?: string
    isbn?: string
  }
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export format */
  format: ExportFormat
  /** Path to exported file */
  filePath: string
  /** File size in bytes */
  fileSize: number
  /** Number of pages exported */
  pageCount: number
  /** Export duration in milliseconds */
  duration: number
  /** Whether export was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Base exporter interface
 */
export interface Exporter {
  /** Format this exporter handles */
  readonly format: ExportFormat

  /**
   * Export content to file
   * @param content - Content chunks with text and screenshots
   * @param metadata - Book metadata
   * @param options - Export options
   * @returns Export result
   */
  export(
    content: ContentChunk[],
    metadata: BookMetadata,
    options: ExportOptions
  ): Promise<ExportResult>

  /**
   * Validate that the exporter can run
   * @returns True if exporter dependencies are available
   */
  isAvailable?(): Promise<boolean>

  /**
   * Get required dependencies for this exporter
   * @returns List of dependency names
   */
  getDependencies?(): string[]
}

/**
 * Export error types
 */
export class ExportError extends Error {
  constructor(
    message: string,
    public readonly format: ExportFormat,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'ExportError'
  }
}

/**
 * Exporter not available error
 */
export class ExporterNotAvailableError extends ExportError {
  constructor(format: ExportFormat, reason: string) {
    super(`Exporter '${format}' is not available: ${reason}`, format)
    this.name = 'ExporterNotAvailableError'
  }
}

/**
 * Export processing error
 */
export class ExportProcessingError extends ExportError {
  constructor(format: ExportFormat, cause: Error) {
    super(`Failed to export as ${format}: ${cause.message}`, format, cause)
    this.name = 'ExportProcessingError'
  }
}
