/**
 * Batch OCR Orchestration
 * Provides utilities for efficient batch processing of OCR tasks
 */

import { existsSync } from 'fs'
import pMap from 'p-map'
import type { OcrProvider, OcrProgressCallback } from './types.js'
import { OcrProcessingError } from './types.js'

/**
 * Batch OCR options
 */
export interface BatchOcrOptions {
  /** Number of concurrent OCR operations */
  concurrency?: number
  /** Progress callback */
  onProgress?: OcrProgressCallback
  /** Whether to continue on errors */
  continueOnError?: boolean
  /** Retry failed pages */
  retryFailures?: boolean
  /** Maximum retries per page */
  maxRetries?: number
}

/**
 * Batch OCR result
 */
export interface BatchOcrResult {
  /** Successfully processed results */
  results: Array<{ path: string; text: string }>
  /** Failed pages */
  failures: Array<{ path: string; error: string }>
  /** Processing statistics */
  stats: {
    total: number
    successful: number
    failed: number
    totalTime: number
    avgTimePerPage: number
  }
}

/**
 * Perform batch OCR with progress tracking and error handling
 */
export async function performBatchOcr(
  provider: OcrProvider,
  imagePaths: string[],
  options: BatchOcrOptions = {}
): Promise<BatchOcrResult> {
  const {
    concurrency = 4,
    onProgress,
    continueOnError = true,
    retryFailures = true,
    maxRetries = 3
  } = options

  const startTime = Date.now()
  const results: Array<{ path: string; text: string }> = []
  const failures: Array<{ path: string; error: string }> = []

  let completed = 0

  // Filter out non-existent files
  const validPaths = imagePaths.filter((path) => {
    if (!existsSync(path)) {
      failures.push({ path, error: 'File not found' })
      return false
    }
    return true
  })

  // Process with concurrency control
  await pMap(
    validPaths,
    async (imagePath) => {
      let lastError: Error | undefined
      let success = false

      // Retry logic
      for (let attempt = 0; attempt < maxRetries && !success; attempt++) {
        try {
          const text = await provider.ocr(imagePath)
          results.push({ path: imagePath, text })
          success = true
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          // Don't retry on certain errors
          if (!retryFailures || !shouldRetry(lastError)) {
            break
          }

          // Wait before retry
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            )
          }
        }
      }

      // Record failure if all retries exhausted
      if (!success) {
        failures.push({
          path: imagePath,
          error: lastError?.message || 'Unknown error'
        })

        if (!continueOnError) {
          throw new OcrProcessingError(
            provider.engine,
            imagePath,
            lastError || new Error('OCR failed')
          )
        }
      }

      // Report progress
      completed++
      if (onProgress) {
        onProgress(completed, validPaths.length, imagePath)
      }
    },
    { concurrency }
  )

  const totalTime = Date.now() - startTime
  const successful = results.length

  return {
    results,
    failures,
    stats: {
      total: imagePaths.length,
      successful,
      failed: failures.length,
      totalTime,
      avgTimePerPage: successful > 0 ? totalTime / successful : 0
    }
  }
}

/**
 * Check if an error should trigger a retry
 */
function shouldRetry(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Don't retry on these errors
  const noRetryPatterns = [
    'file not found',
    'invalid image',
    'api key',
    'unauthorized',
    'quota exceeded',
    'model not found'
  ]

  return !noRetryPatterns.some((pattern) => message.includes(pattern))
}

/**
 * Save OCR results to files
 */
export async function saveBatchResults(
  results: BatchOcrResult,
  outputDir: string
): Promise<void> {
  const { mkdir, writeFile } = await import('fs/promises')
  const { join, basename } = await import('path')

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true })

  // Save each result
  for (const { path, text } of results.results) {
    const filename = basename(path, '.png') + '.txt'
    const outputPath = join(outputDir, filename)
    await writeFile(outputPath, text, 'utf-8')
  }

  // Save failure log if there are any
  if (results.failures.length > 0) {
    const failureLog = results.failures
      .map((f) => `${f.path}: ${f.error}`)
      .join('\n')
    await writeFile(join(outputDir, 'failures.log'), failureLog, 'utf-8')
  }

  // Save stats
  const statsFile = join(outputDir, 'ocr-stats.json')
  await writeFile(statsFile, JSON.stringify(results.stats, null, 2), 'utf-8')
}

/**
 * Estimate remaining time for batch OCR
 */
export function estimateRemainingTime(
  completed: number,
  total: number,
  avgTimePerPage: number
): number {
  const remaining = total - completed
  return remaining * avgTimePerPage
}

/**
 * Format time in human-readable format
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Calculate OCR throughput (pages per second)
 */
export function calculateThroughput(
  pagesProcessed: number,
  timeMs: number
): number {
  return (pagesProcessed / timeMs) * 1000
}
