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
import type { WordPosition } from '../types.js'

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

  /**
   * Perform OCR with word-level position data (hOCR format)
   * Returns both plain text and word positions for searchable PDFs
   */
  async ocrWithPositions(
    imagePath: string,
    options?: { lang?: string }
  ): Promise<{ text: string; wordPositions: WordPosition[] }> {
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
      `tesseract-hocr-${randomBytes(8).toString('hex')}`
    )

    try {
      const lang = options?.lang || this.lang

      // Tesseract args for hOCR output
      const args = [
        imagePath,
        tmpFile,
        '-l',
        lang,
        '--psm',
        '3', // Fully automatic page segmentation
        '--oem',
        '3', // Default OCR Engine Mode
        'hocr' // Output hOCR format
      ]

      await execFileAsync(tesseract, args, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      // Read the hOCR output file
      const outputPath = `${tmpFile}.hocr`
      if (!existsSync(outputPath)) {
        throw new Error('Tesseract did not create hOCR output file')
      }

      const { readFile } = await import('fs/promises')
      const hocrXml = await readFile(outputPath, 'utf-8')

      // Parse hOCR to extract word positions
      const wordPositions = this.parseHocr(hocrXml)

      // Extract plain text from word positions
      const text = wordPositions.map((w) => w.text).join(' ')

      // Clean up temp file
      await unlink(outputPath).catch(() => {
        /* ignore cleanup errors */
      })

      return { text: text.trim(), wordPositions }
    } catch (error) {
      // Clean up on error
      try {
        await unlink(`${tmpFile}.hocr`)
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
   * Parse hOCR XML to extract word positions
   */
  private parseHocr(hocrXml: string): WordPosition[] {
    const wordPositions: WordPosition[] = []

    // Match all ocrx_word spans
    // Format: <span class='ocrx_word' id='word_1_1' title='bbox 54 10 129 29; x_wconf 96'>Courage</span>
    const wordRegex =
      /<span class=['"]ocrx_word['"][^>]*title=['"]([^'"]*?)['"][^>]*>([^<]*)<\/span>/g

    let match
    while ((match = wordRegex.exec(hocrXml)) !== null) {
      const titleAttr = match[1]
      const text = match[2]?.trim()

      if (!titleAttr || !text) continue

      // Parse bbox from title attribute
      // Format: "bbox 54 10 129 29; x_wconf 96"
      const bboxMatch = /bbox (\d+) (\d+) (\d+) (\d+)/.exec(titleAttr)
      const confMatch = /x_wconf (\d+)/.exec(titleAttr)

      if (
        bboxMatch &&
        bboxMatch[1] &&
        bboxMatch[2] &&
        bboxMatch[3] &&
        bboxMatch[4]
      ) {
        wordPositions.push({
          text,
          bbox: {
            x0: parseInt(bboxMatch[1]),
            y0: parseInt(bboxMatch[2]),
            x1: parseInt(bboxMatch[3]),
            y1: parseInt(bboxMatch[4])
          },
          confidence:
            confMatch && confMatch[1] ? parseInt(confMatch[1]) : undefined
        })
      }
    }

    return wordPositions
  }
}
