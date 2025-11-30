/**
 * Exporter Factory
 * Central module for creating and managing exporters
 */

import type { ExportFormat } from '../types.js'
import type { Exporter, ExportOptions, ExportResult } from './types.js'
import { ExporterNotAvailableError } from './types.js'
import { TextExporter } from './text.js'
import { PdfExporter } from './pdf.js'
import { MarkdownExporter } from './markdown.js'
import { EpubExporter } from './epub.js'

/**
 * Create an exporter instance for the specified format
 * @param format - Export format
 * @returns Exporter instance
 */
export function createExporter(format: ExportFormat): Exporter {
  switch (format) {
    case 'text':
      return new TextExporter()

    case 'pdf':
    case 'pdf-ocr':
      return new PdfExporter()

    case 'markdown':
      return new MarkdownExporter()

    case 'epub':
      return new EpubExporter()

    case 'audio':
      throw new ExporterNotAvailableError(
        'audio',
        'Audio export not yet implemented (coming in Phase 6)'
      )

    default:
      throw new Error(`Unknown export format: ${format}`)
  }
}

/**
 * Get all available exporters
 * @returns List of available format names
 */
export async function getAvailableExporters(): Promise<ExportFormat[]> {
  const formats: ExportFormat[] = ['text', 'pdf', 'markdown']

  // Check if EPUB (Calibre) is available
  const epubExporter = new EpubExporter()
  if (await epubExporter.isAvailable()) {
    formats.push('epub')
  }

  return formats
}

/**
 * Check if a specific exporter is available
 * @param format - Export format to check
 * @returns True if the exporter is available
 */
export async function isExporterAvailable(
  format: ExportFormat
): Promise<boolean> {
  try {
    const exporter = createExporter(format)
    return !exporter.isAvailable || (await exporter.isAvailable())
  } catch {
    return false
  }
}

/**
 * Get exporter information
 * @param format - Export format
 * @returns Exporter info including dependencies
 */
export function getExporterInfo(format: ExportFormat): {
  format: ExportFormat
  name: string
  description: string
  dependencies: string[]
} {
  const infos = {
    text: {
      format: 'text' as const,
      name: 'Plain Text',
      description: 'Export as plain text file with optional chapter headers',
      dependencies: []
    },
    pdf: {
      format: 'pdf' as const,
      name: 'PDF',
      description: 'Export as PDF with TOC bookmarks and optional text layer',
      dependencies: ['pdfkit']
    },
    'pdf-ocr': {
      format: 'pdf-ocr' as const,
      name: 'Searchable PDF',
      description: 'PDF with OCR text layer for full-text search',
      dependencies: ['pdfkit']
    },
    markdown: {
      format: 'markdown' as const,
      name: 'Markdown',
      description: 'Export as Markdown with chapter structure and front matter',
      dependencies: []
    },
    epub: {
      format: 'epub' as const,
      name: 'EPUB',
      description: 'Export as EPUB e-book format using Calibre',
      dependencies: ['Calibre (ebook-convert)']
    },
    audio: {
      format: 'audio' as const,
      name: 'Audiobook',
      description: 'Generate AI-narrated audiobook with chapter markers',
      dependencies: ['OpenAI TTS or UnrealSpeech', 'ffmpeg']
    }
  }

  return infos[format] || infos.text
}

/**
 * Export to multiple formats
 * @param content - Content chunks
 * @param metadata - Book metadata
 * @param formats - Array of export formats
 * @param baseOptions - Base export options
 * @returns Array of export results
 */
export async function exportMultiple(
  content: Parameters<Exporter['export']>[0],
  metadata: Parameters<Exporter['export']>[1],
  formats: ExportFormat[],
  baseOptions: ExportOptions
): Promise<ExportResult[]> {
  const results: ExportResult[] = []

  for (const format of formats) {
    try {
      const exporter = createExporter(format)
      const result = await exporter.export(content, metadata, baseOptions)
      results.push(result)
    } catch (error) {
      // Record failure but continue with other formats
      results.push({
        format,
        filePath: '',
        fileSize: 0,
        pageCount: 0,
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return results
}

// Re-export types and classes
export type {
  Exporter,
  ExportOptions,
  ExportResult,
  TextExportOptions,
  PdfExportOptions,
  MarkdownExportOptions,
  EpubExportOptions
} from './types.js'

export {
  ExportError,
  ExporterNotAvailableError,
  ExportProcessingError
} from './types.js'

export { TextExporter } from './text.js'
export { PdfExporter } from './pdf.js'
export { MarkdownExporter } from './markdown.js'
export { EpubExporter } from './epub.js'
