/**
 * Browser Session Manager
 * Handles Playwright browser and page lifecycle for Kindle Cloud Reader
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page
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
 * Navigate to Kindle Cloud Reader
 * @param page - Playwright page
 * @param asin - Optional Amazon ASIN to open specific book
 * @returns Promise that resolves when page is loaded
 */
export async function navigateToKindle(
  page: Page,
  asin?: string
): Promise<void> {
  const url = asin
    ? `https://read.amazon.com/kindle-library?asin=${asin}`
    : 'https://read.amazon.com/kindle-library'

  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 60000
  })

  // Wait for the reader to be ready
  try {
    await page.waitForSelector('#kindleReader_book_image', {
      timeout: 10000
    })
  } catch {
    // Reader might already be open or selector might differ
    // This is okay, we'll handle it in navigation
  }
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
  // Wait for the main content area
  await page.waitForSelector('#kindleReader_book_image', { timeout })

  // Wait for any loading indicators to disappear
  await page.waitForFunction(
    () => {
      // @ts-expect-error - This runs in browser context where document is available
      const loadingElements = document.querySelectorAll(
        '[class*="loading"], [class*="spinner"]'
      )
      return loadingElements.length === 0
    },
    { timeout }
  )

  // Small additional delay for stability
  await page.waitForTimeout(500)
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
export async function isLastPage(page: Page): Promise<boolean> {
  try {
    // Check if next button is disabled
    const nextButton = await page.$('#kindleReader_pageTurn_right')
    if (!nextButton) return true

    const isDisabled = await nextButton.evaluate((el) =>
      el.hasAttribute('disabled')
    )
    return isDisabled
  } catch {
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
    // Click the next page button
    await page.click('#kindleReader_pageTurn_right')

    // Wait for page transition with human-like delay
    const delay = randomDelay(config.delayMinMs, config.delayMaxMs)
    await page.waitForTimeout(delay)

    // Wait for new content to load
    await waitForPageReady(page, 10000)

    return true
  } catch (error) {
    console.warn('Failed to navigate to next page:', error)
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
