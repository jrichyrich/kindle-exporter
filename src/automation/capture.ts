/**
 * Screenshot Capture
 * Captures pages from Kindle Cloud Reader
 */

import { mkdir } from 'fs/promises'
import { join } from 'path'
import type { Page } from 'playwright'
import type { PageChunk } from '../types.js'

/**
 * Screenshot options
 */
export interface CaptureOptions {
  /** Output directory for screenshots */
  outputDir: string
  /** Book title for folder naming */
  bookTitle: string
  /** Screenshot quality (0-100) */
  quality?: number
  /** Image format */
  format?: 'png' | 'jpeg'
}

/**
 * Capture screenshot of current page
 * @param page - Playwright page
 * @param pageNumber - Current page number
 * @param options - Capture options
 * @returns Page chunk with screenshot path
 */
export async function capturePage(
  page: Page,
  pageNumber: number,
  options: CaptureOptions
): Promise<PageChunk> {
  // Ensure output directory exists
  const screenshotDir = join(
    options.outputDir,
    sanitizeFolderName(options.bookTitle),
    'screenshots'
  )
  await mkdir(screenshotDir, { recursive: true })

  // Generate screenshot filename
  const paddedPageNum = String(pageNumber).padStart(4, '0')
  const extension = options.format || 'png'
  const screenshotPath = join(
    screenshotDir,
    `page_${paddedPageNum}.${extension}`
  )

  try {
    // Take screenshot of the full viewport
    // Kindle Cloud Reader displays the book content in the main viewport
    await page.screenshot({
      path: screenshotPath,
      type: extension,
      quality: extension === 'jpeg' ? options.quality || 90 : undefined,
      fullPage: false // Just capture viewport, not full scrollable page
    })

    return {
      index: pageNumber - 1, // 0-indexed
      page: pageNumber,
      screenshot: screenshotPath
    }
  } catch (error) {
    console.error(`Failed to capture page ${pageNumber}:`, error)
    throw error
  }
}

/**
 * Capture multiple pages
 * @param page - Playwright page
 * @param startPage - Starting page number
 * @param endPage - Ending page number
 * @param options - Capture options
 * @param onProgress - Progress callback
 * @returns Array of page chunks
 */
export async function capturePages(
  page: Page,
  startPage: number,
  endPage: number,
  options: CaptureOptions,
  onProgress?: (current: number, total: number) => void
): Promise<PageChunk[]> {
  const chunks: PageChunk[] = []
  const totalPages = endPage - startPage + 1

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const chunk = await capturePage(page, pageNum, options)
    chunks.push(chunk)

    if (onProgress) {
      onProgress(pageNum - startPage + 1, totalPages)
    }
  }

  return chunks
}

/**
 * Sanitize folder name for file system
 */
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 200)
}
