/**
 * Tesseract OCR Provider
 * Uses Tesseract OCR engine for cross-platform text recognition
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { unlink } from 'fs/promises'
import type { OcrProvider, OcrProviderConfig } from './types.js'
import { OcrProcessingError, ProviderNotAvailableError } from './types.js'

const execFileAsync = promisify(execFile)

/**
 * Tesseract OCR provider for cross-platform text recognition
 */
export class TesseractProvider implements OcrProvider {
  readonly engine = 'tesseract' as const
  private readonly lang: string
  private tesseractPath?: string

  constructor(config: OcrProviderConfig) {
    // Default to English, but support multiple languages
    // Format: eng (single) or eng+deu+fra (multiple)
    this.lang = config.lang || 'eng'
  }

  /**
   * Find tesseract executable
   */
  private async findTesseract(): Promise<string> {
    if (this.tesseractPath) {
      return this.tesseractPath
    }

    // Try common locations
    const possiblePaths = [
      'tesseract', // In PATH
      '/usr/local/bin/tesseract', // Homebrew default
      '/opt/homebrew/bin/tesseract', // Homebrew on Apple Silicon
      '/usr/bin/tesseract' // Linux default
    ]

    for (const path of possiblePaths) {
      try {
        await execFileAsync(path, ['--version'])
        this.tesseractPath = path
        return path
      } catch {
        // Try next path
      }
    }

    throw new ProviderNotAvailableError(
      'tesseract',
      'Tesseract not found. Install with: brew install tesseract (macOS) or apt-get install tesseract-ocr (Linux)'
    )
  }

  /**
   * Check if Tesseract is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.findTesseract()
      return true
    } catch {
      return false
    }
  }

  /**
   * Perform OCR on a single image
   */
  async ocr(imagePath: string, options?: { lang?: string }): Promise<string> {
    const tesseract = await this.findTesseract()

    if (!existsSync(imagePath)) {
      throw new OcrProcessingError(
        'tesseract',
        imagePath,
        new Error(`Image file not found: ${imagePath}`)
      )
    }

    // Create temporary output file
    const tmpFile = join(
      tmpdir(),
      `tesseract-${randomBytes(8).toString('hex')}`
    )

    try {
      const lang = options?.lang || this.lang

      // Tesseract args: image input output -l lang
      // Note: output is without extension, tesseract adds .txt
      const args = [
        imagePath,
        tmpFile,
        '-l',
        lang,
        '--psm',
        '3', // Fully automatic page segmentation
        '--oem',
        '3' // Default OCR Engine Mode
      ]

      await execFileAsync(tesseract, args, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      // Read the output file
      const outputPath = `${tmpFile}.txt`
      if (!existsSync(outputPath)) {
        throw new Error('Tesseract did not create output file')
      }

      const { readFile } = await import('fs/promises')
      const text = await readFile(outputPath, 'utf-8')

      // Clean up temp file
      await unlink(outputPath).catch(() => {
        /* ignore cleanup errors */
      })

      return text.trim()
    } catch (error) {
      // Clean up on error
      try {
        await unlink(`${tmpFile}.txt`)
      } catch {
        /* ignore */
      }

      throw new OcrProcessingError(
        'tesseract',
        imagePath,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Perform OCR on multiple images
   */
  async ocrBatch(
    imagePaths: string[],
    options?: { lang?: string }
  ): Promise<string[]> {
    // Process in parallel with reasonable concurrency
    const results: string[] = []
    const concurrency = 4

    for (let i = 0; i < imagePaths.length; i += concurrency) {
      const batch = imagePaths.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map((path) => this.ocr(path, options))
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Tesseract is free
   */
  estimateCost(_pageCount: number): number {
    return 0 // Free!
  }

  /**
   * Get available languages
   */
  async getAvailableLanguages(): Promise<string[]> {
    try {
      const tesseract = await this.findTesseract()
      const { stdout } = await execFileAsync(tesseract, ['--list-langs'])

      // Parse output (first line is header, rest are language codes)
      const lines = stdout.trim().split('\n')
      return lines.slice(1) // Skip header
    } catch {
      return ['eng'] // Default to English if we can't list
    }
  }
}
