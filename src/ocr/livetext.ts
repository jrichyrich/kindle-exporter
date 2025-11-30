/**
 * Live Text OCR Provider
 * Uses Apple Vision framework for native OCR on macOS 12+
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { OcrProvider, OcrProviderConfig } from './types.js'
import { OcrProcessingError, ProviderNotAvailableError } from './types.js'

const execFileAsync = promisify(execFile)

/**
 * Get the path to the Swift OCR script
 */
function getSwiftScriptPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  return resolve(__dirname, '../../scripts/livetext_ocr.swift')
}

/**
 * Live Text OCR provider for macOS
 */
export class LiveTextProvider implements OcrProvider {
  readonly engine = 'livetext' as const
  private readonly lang?: string
  private readonly scriptPath: string

  constructor(config: OcrProviderConfig) {
    this.lang = config.lang
    this.scriptPath = getSwiftScriptPath()
  }

  /**
   * Check if Live Text is available
   */
  async isAvailable(): Promise<boolean> {
    // Check platform
    if (process.platform !== 'darwin') {
      return false
    }

    // Check if script exists
    if (!existsSync(this.scriptPath)) {
      return false
    }

    // Try to run swift --version to check if Swift is available
    try {
      await execFileAsync('swift', ['--version'])
      return true
    } catch {
      return false
    }
  }

  /**
   * Perform OCR on a single image
   */
  async ocr(imagePath: string, options?: { lang?: string }): Promise<string> {
    if (!(await this.isAvailable())) {
      throw new ProviderNotAvailableError(
        'livetext',
        'Live Text is only available on macOS with Swift installed'
      )
    }

    if (!existsSync(imagePath)) {
      throw new OcrProcessingError(
        'livetext',
        imagePath,
        new Error(`Image file not found: ${imagePath}`)
      )
    }

    try {
      const lang = options?.lang || this.lang || 'en'
      const args = [this.scriptPath, imagePath, lang]

      const { stdout, stderr } = await execFileAsync('swift', args, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large text
      })

      if (stderr && stderr.trim().length > 0) {
        console.warn(`Live Text warning: ${stderr}`)
      }

      return stdout.trim()
    } catch (error) {
      throw new OcrProcessingError(
        'livetext',
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
   * Live Text is free
   */
  estimateCost(_pageCount: number): number {
    return 0 // Free!
  }
}
