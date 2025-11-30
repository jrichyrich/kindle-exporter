/**
 * Screenshot Capture
 * Captures pages from Kindle Cloud Reader
 */

import { mkdir } from 'fs/promises'
import { join } from 'path'
import type { Page, Frame } from 'playwright'
import type { PageChunk } from '../types.js'

/**
 * Selectors to locate the reading canvas/content area
 * Tries multiple patterns for compatibility with different KCR versions
 */
const READING_CANVAS_SELECTORS = [
  '.kg-view canvas',
  '.kg-view img',
  '[data-testid="kindle-reader-page"] canvas',
  '[data-testid="kindle-reader-page"]',
  '.kindleReader_page canvas',
  '#kindleReader_book_image'
]

/**
 * Selectors for reader iframes (some versions use iframes)
 */
const READER_IFRAME_SELECTORS = [
  '#KindleReaderIFrame',
  'iframe[id*="KindleReader"]',
  'iframe[title*="Kindle"]'
]

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
    // Try to find the reading canvas to clip out UI elements
    const clip = await determineReadingClip(page)

    // Take screenshot of either the clipped canvas or full viewport as fallback
    await page.screenshot({
      path: screenshotPath,
      type: extension,
      quality: extension === 'jpeg' ? options.quality || 90 : undefined,
      fullPage: !clip, // Use fullPage if no clip found
      clip: clip || undefined
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
 * Determine the clip area for the reading canvas
 * Tries to find the book content area to exclude UI elements
 */
async function determineReadingClip(
  page: Page
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  // First try to locate clip from main page
  const clip = await locateClipFromRoot(page)
  if (clip) return clip

  // If not found, check inside iframes
  for (const iframeSelector of READER_IFRAME_SELECTORS) {
    try {
      const iframeLocator = page.locator(iframeSelector).first()
      const iframeHandle = await iframeLocator
        .elementHandle({ timeout: 1500 })
        .catch(() => null)

      if (!iframeHandle) continue

      const frame = await iframeHandle.contentFrame()
      if (!frame) continue

      const frameClip = await locateClipFromRoot(frame)
      if (frameClip) return frameClip
    } catch {
      // Continue to next iframe selector
      continue
    }
  }

  // No clip found - will fall back to full viewport
  return null
}

/**
 * Locate clip area from a page or frame
 */
async function locateClipFromRoot(
  root: Page | Frame
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  for (const selector of READING_CANVAS_SELECTORS) {
    try {
      const locator = root.locator(selector)
      const count = await locator.count()

      if (count === 0) continue

      const boundingBox = await locator.first().boundingBox()
      if (boundingBox) {
        return {
          x: Math.max(boundingBox.x, 0),
          y: Math.max(boundingBox.y, 0),
          width: boundingBox.width,
          height: boundingBox.height
        }
      }
    } catch {
      // Continue to next selector
      continue
    }
  }

  return null
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
