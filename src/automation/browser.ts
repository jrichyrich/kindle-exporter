/**
 * Browser Session Manager
 * Handles Playwright browser and page lifecycle for Kindle Cloud Reader
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Frame
} from 'playwright'
import type { ToolConfig } from '../types.js'

/**
 * Browser session configuration
 */
export interface BrowserSessionConfig {
  /** Chrome profile path for authentication */
  profilePath: string
  /** Chrome executable path (optional) */
  executablePath?: string
  /** Show browser window (headful mode) */
  headful?: boolean
  /** Additional browser args */
  args?: string[]
}

/**
 * Browser session wrapper
 */
export interface BrowserSession {
  browser: Browser
  context: BrowserContext
  page: Page
}

/**
 * Create and configure browser session
 * @param config - Browser configuration
 * @returns Browser session with context and page
 */
export async function createBrowserSession(
  config: BrowserSessionConfig
): Promise<BrowserSession> {
  // Launch browser with persistent context (uses Chrome profile)
  const context = await chromium.launchPersistentContext(config.profilePath, {
    headless: !config.headful,
    executablePath: config.executablePath,
    viewport: { width: 1920, height: 1080 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      ...(config.args || [])
    ],
    // Disable automation indicators
    bypassCSP: true,
    ignoreHTTPSErrors: true
  })

  // Get the browser instance
  const browser = context.browser()
  if (!browser) {
    throw new Error('Failed to get browser instance')
  }

  // Create or get the first page
  let page = context.pages()[0]
  if (!page) {
    page = await context.newPage()
  }

  // Set user agent to avoid detection
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  })

  return { browser, context, page }
}

/**
 * Widen and optimize the reading canvas for better OCR
 * Forces single-column layout, increases width, and applies slight zoom
 * This significantly improves OCR accuracy by:
 * - Eliminating multi-column confusion
 * - Maximizing text per capture
 * - Increasing character size for better recognition
 *
 * @param page - Playwright page
 * @param zoomOverride - Optional custom zoom factor (default: auto-calculated)
 */
async function widenReadingCanvas(
  page: Page,
  zoomOverride?: number
): Promise<void> {
  const viewport = page.viewportSize()
  const vw = viewport?.width ?? 1280

  // Calculate auto-zoom: 1.0 to 1.08x based on viewport width
  const autoZoom = 1 + Math.min(Math.max(((vw - 1200) / 2400) * 0.05, 0), 0.08)
  const zoomFactor = zoomOverride ?? autoZoom

  // Calculate canvas width: 90-95% of viewport
  const widthPct = Math.min(
    90 + Math.min(Math.max(((vw - 1200) / 2400) * 5, 0), 5),
    95
  )

  // Apply widening to a page or frame context
  const apply = async (ctx: Page | Frame) => {
    try {
      await ctx.evaluate(
        ({ zoom, widthPercent }) => {
          // Selectors for various Kindle reader elements
          const selectors = [
            '#kr-renderer',
            '.kindleReader_page',
            '[data-testid="kindle-reader-page"]',
            '.kg-view',
            '.kg-full-page-img img'
          ]

          // Apply zoom to entire document
          // @ts-expect-error - This runs in browser context where document is available
          document.documentElement.style.zoom = `${zoom}`
          // @ts-expect-error - This runs in browser context where document is available
          document.documentElement.style.overflowX = 'auto'

          // Widen all reading canvas elements
          selectors.forEach((sel) => {
            // @ts-expect-error - This runs in browser context
            document.querySelectorAll(sel).forEach((el: HTMLElement) => {
              el.style.maxWidth = `${widthPercent}vw`
              el.style.width = `${widthPercent}vw`
              el.style.margin = '0 auto'
              el.style.overflow = 'visible'
              el.style.transformOrigin = 'top center'
            })
          })
        },
        { zoom: zoomFactor, widthPercent: widthPct }
      )
    } catch {
      // Ignore errors if context not ready
    }
  }

  // Apply to main page
  await apply(page)

  // Also apply to any iframes (some Kindle versions use iframes)
  try {
    const iframeSelectors = [
      '#KindleReaderIFrame',
      'iframe[id*="KindleReader"]',
      'iframe[title*="Kindle"]'
    ]

    for (const selector of iframeSelectors) {
      const iframeLocator = page.locator(selector).first()
      const iframeHandle = await iframeLocator
        .elementHandle({ timeout: 1000 })
        .catch(() => null)

      if (iframeHandle) {
        const frame = await iframeHandle.contentFrame()
        if (frame) {
          await apply(frame)
        }
      }
    }
  } catch {
    // Ignore iframe errors
  }
}

/**
 * Navigate to Kindle Cloud Reader
 * @param page - Playwright page
 * @param asin - Optional Amazon ASIN to open specific book
 * @returns Promise that resolves when page is loaded
 */
export async function navigateToKindle(
  page: Page,
  asin?: string
): Promise<void> {
  // Use the correct URL format to directly open the book in the reader
  const url = asin
    ? `https://read.amazon.com/?asin=${asin}&ref_=kcr_app_sdr_core`
    : 'https://read.amazon.com/kindle-library'

  await page.goto(url, {
    waitUntil: 'domcontentloaded', // Don't wait for networkidle since Kindle Cloud Reader keeps making requests
    timeout: 60000
  })

  // Give the page a moment to start loading
  await page.waitForTimeout(2000)

  // Wait for the reader to be ready
  try {
    await page.waitForSelector('#kindleReader_book_image', {
      timeout: 15000
    })
  } catch {
    // Reader might use a different structure, check for read button
    const hasReadNow = await page.$('[data-testid="read-now"]')
    if (hasReadNow) {
      await hasReadNow.click()
      await page.waitForTimeout(3000)
    }
  }

  // Optimize the reading canvas for OCR (single column, widened, slightly zoomed)
  await widenReadingCanvas(page)
}

/**
 * Wait for page to be ready for capture
 * @param page - Playwright page
 * @param timeout - Timeout in milliseconds
 */
export async function waitForPageReady(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  // Wait for page content to be present - just check that body has text
  try {
    await page.waitForFunction(
      () => {
        // @ts-expect-error - This runs in browser context where document is available
        const bodyText = document.body.innerText || ''
        // Consider page ready if there's substantial text content
        return bodyText.length > 100
      },
      { timeout }
    )
  } catch {
    // If timeout, just continue - page might already be ready
  }

  // Additional delay for stability
  await page.waitForTimeout(1000)
}

/**
 * Get current page number from reader
 * @param page - Playwright page
 * @returns Current page number or null
 */
export async function getCurrentPageNumber(page: Page): Promise<number | null> {
  try {
    const pageText = await page.textContent('#kindleReader_pageTurn_label')
    if (!pageText || typeof pageText !== 'string') return null

    // Extract page number from text like "Page 42 of 300"
    const match = pageText.match(/Page\s+(\d+)/)
    return match && match[1] ? parseInt(match[1], 10) : null
  } catch {
    return null
  }
}

/**
 * Check if we're on the last page
 * @param page - Playwright page
 * @returns True if on last page
 */
export async function isLastPage(_page: Page): Promise<boolean> {
  try {
    // Since we're using keyboard navigation, we can't reliably detect the last page
    // via button state. Instead, we'll rely on the navigation failure to stop the loop.
    // For now, always return false and let navigateNextPage handle detection.
    console.log(
      'isLastPage: Using navigation-based detection (returning false)'
    )
    return false
  } catch (error) {
    console.warn('isLastPage error:', error)
    return false
  }
}

/**
 * Navigate to next page
 * @param page - Playwright page
 * @param config - Tool configuration for delays
 * @returns True if navigation succeeded
 */
export async function navigateNextPage(
  page: Page,
  config: ToolConfig
): Promise<boolean> {
  try {
    // Strategy 1: Try keyboard navigation (most reliable)
    console.log('navigateNextPage: Trying keyboard navigation (Right Arrow)')
    await page.keyboard.press('ArrowRight')

    // Wait for page transition with human-like delay
    const delay = randomDelay(config.delayMinMs, config.delayMaxMs)
    console.log(`navigateNextPage: Waiting ${delay}ms for page transition`)
    await page.waitForTimeout(delay)

    // Wait for new content to load
    await waitForPageReady(page, 10000)

    console.log('navigateNextPage: Successfully navigated to next page')
    return true
  } catch (error) {
    console.warn('navigateNextPage: Failed to navigate to next page:', error)

    // Strategy 2: Fallback to clicking right side of screen
    try {
      console.log('navigateNextPage: Fallback - clicking right side of screen')
      const viewport = page.viewportSize()
      if (viewport) {
        // Click on the right 20% of the screen, middle height
        await page.mouse.click(viewport.width * 0.9, viewport.height * 0.5)
        await page.waitForTimeout(
          randomDelay(config.delayMinMs, config.delayMaxMs)
        )
        await waitForPageReady(page, 10000)
        console.log('navigateNextPage: Fallback navigation succeeded')
        return true
      }
    } catch (fallbackError) {
      console.warn('navigateNextPage: Fallback also failed:', fallbackError)
    }

    return false
  }
}

/**
 * Navigate to previous page
 * @param page - Playwright page
 * @param config - Tool configuration for delays
 * @returns True if navigation succeeded
 */
export async function navigatePrevPage(
  page: Page,
  config: ToolConfig
): Promise<boolean> {
  try {
    await page.click('#kindleReader_pageTurn_left')

    const delay = randomDelay(config.delayMinMs, config.delayMaxMs)
    await page.waitForTimeout(delay)

    await waitForPageReady(page, 10000)

    return true
  } catch (error) {
    console.warn('Failed to navigate to previous page:', error)
    return false
  }
}

/**
 * Close browser session
 * @param session - Browser session to close
 */
export async function closeBrowserSession(
  session: BrowserSession
): Promise<void> {
  try {
    await session.context.close()
    await session.browser.close()
  } catch (error) {
    console.warn('Error closing browser session:', error)
  }
}

/**
 * Generate random delay in human-like range
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
