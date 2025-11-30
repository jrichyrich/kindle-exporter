/**
 * Metadata Extractor
 * Extracts book metadata from Kindle Cloud Reader using network interception
 */

import type { Page } from 'playwright'
import type {
  BookMetadata,
  AmazonBookMeta,
  AmazonBookInfo,
  Nav,
  AmazonRenderLocationMap,
  AmazonRenderToc,
  PageChunk
} from '../types.js'
import { parseToc } from './parser.js'

/**
 * Network response data captured during page load
 */
interface CapturedData {
  metadata?: AmazonBookMeta
  bookInfo?: AmazonBookInfo
  locationMap?: AmazonRenderLocationMap
  toc?: AmazonRenderToc
}

/**
 * Extract complete book metadata from Kindle Cloud Reader
 * @param page - Playwright page with Kindle reader loaded
 * @param _asin - Amazon Standard Identification Number (for future use)
 * @returns Complete book metadata
 */
export async function extractBookMetadata(
  page: Page,
  _asin: string
): Promise<BookMetadata> {
  const capturedData: CapturedData = {}

  // Set up network interceptors before navigation
  await setupNetworkInterceptors(page, capturedData)

  // Navigate to the book or wait for data if already loaded
  // The interceptors will capture the data during page load

  // Wait for all metadata to be captured (with timeout)
  await waitForMetadata(capturedData, 45000)

  // Validate we have the minimum required data
  if (!capturedData.metadata || !capturedData.bookInfo) {
    throw new Error(
      'Failed to extract book metadata. Ensure the book is loaded in Kindle Cloud Reader.'
    )
  }

  // Parse TOC with location mapping
  const toc = capturedData.toc
    ? parseToc(capturedData.toc, capturedData.locationMap)
    : []

  // Calculate navigation info
  const nav = calculateNavigation(
    capturedData.metadata,
    capturedData.locationMap
  )

  // Build complete metadata object
  const metadata: BookMetadata = {
    meta: capturedData.metadata,
    info: capturedData.bookInfo,
    nav,
    toc,
    pages: [], // Will be populated during screenshot capture
    locationMap: capturedData.locationMap || createEmptyLocationMap()
  }

  return metadata
}

/**
 * Set up network request/response interceptors
 */
async function setupNetworkInterceptors(
  page: Page,
  capturedData: CapturedData
): Promise<void> {
  // Intercept metadata JSON (YJmetadata.jsonp)
  page.on('response', async (response) => {
    const url = response.url()

    try {
      // Capture main metadata (YJmetadata.jsonp)
      if (url.includes('YJmetadata.jsonp')) {
        const text = await response.text()
        capturedData.metadata = parseMetadataJsonp(text)
      }

      // Capture book info (startReading response)
      if (url.includes('startReading') || url.includes('getBookInfo')) {
        const json = await response.json()
        // Use data field if present, otherwise use whole response
        capturedData.bookInfo = json.data || json
      }

      // Capture location map (render TAR files)
      if (url.includes('render') && url.includes('locationMap')) {
        const json = await response.json()
        capturedData.locationMap = json
      }

      // Capture TOC
      if (url.includes('toc') || url.includes('tableOfContents')) {
        const json = await response.json()
        if (json.toc || Array.isArray(json)) {
          capturedData.toc = json.toc || json
        }
      }
    } catch (error) {
      // Ignore parsing errors for non-JSON responses
      if (error instanceof Error && !error.message.includes('JSON')) {
        console.warn(`Error parsing response from ${url}:`, error.message)
      }
    }
  })
}

/**
 * Parse JSONP metadata response
 * Format: YJ_metadata(...json...) or loadMetadata(...json...)
 */
function parseMetadataJsonp(jsonp: string): AmazonBookMeta {
  // Remove JSONP wrapper - try multiple patterns
  let match = jsonp.match(/YJ[._]metadata\s*\(\s*({.*})\s*\)/)
  if (!match) {
    match = jsonp.match(/loadMetadata\s*\(\s*({.*})\s*\)/)
  }
  if (!match || !match[1]) {
    throw new Error('Invalid metadata JSONP format')
  }

  const json = JSON.parse(match[1])
  return json as AmazonBookMeta
}

/**
 * Wait for all metadata to be captured
 */
async function waitForMetadata(
  capturedData: CapturedData,
  timeoutMs: number
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    // Check if we have minimum required data
    if (capturedData.metadata && capturedData.bookInfo) {
      // Wait a bit more for optional data (TOC, location map)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Provide helpful error message based on what's missing
  const missing: string[] = []
  if (!capturedData.metadata) missing.push('metadata (YJmetadata.jsonp)')
  if (!capturedData.bookInfo) missing.push('book info (startReading)')

  throw new Error(
    `Timeout waiting for metadata. Missing: ${missing.join(', ')}. ` +
      'Please ensure you are logged into Amazon and the book is in your Kindle library.'
  )
}

/**
 * Calculate navigation information
 */
function calculateNavigation(
  metadata: AmazonBookMeta,
  locationMap?: AmazonRenderLocationMap
): Nav {
  const startPosition = metadata.startPosition || 0
  const endPosition = metadata.endPosition || 0

  // Estimate page count from location map
  let totalNumPages = 0
  let totalNumContentPages = 0

  if (locationMap?.navigationUnit) {
    totalNumPages = locationMap.navigationUnit.length
    // Exclude front/back matter (rough estimate)
    totalNumContentPages = Math.max(0, totalNumPages - 10)
  }

  return {
    startPosition,
    endPosition,
    startContentPosition: startPosition,
    startContentPage: 1,
    endContentPosition: endPosition,
    endContentPage: totalNumContentPages || totalNumPages,
    totalNumPages,
    totalNumContentPages
  }
}

/**
 * Create empty location map as fallback
 */
function createEmptyLocationMap(): AmazonRenderLocationMap {
  return {
    locations: [],
    navigationUnit: []
  }
}

/**
 * Add page to metadata during screenshot capture
 */
export function addPageToMetadata(
  metadata: BookMetadata,
  pageIndex: number,
  pageNumber: number,
  screenshotPath: string
): void {
  const pageChunk: PageChunk = {
    index: pageIndex,
    page: pageNumber,
    screenshot: screenshotPath
  }

  metadata.pages.push(pageChunk)
}

/**
 * Save metadata to JSON file
 */
export async function saveMetadata(
  metadata: BookMetadata,
  outputPath: string
): Promise<void> {
  const { writeFile } = await import('fs/promises')
  await writeFile(outputPath, JSON.stringify(metadata, null, 2), 'utf-8')
}

/**
 * Load metadata from JSON file
 */
export async function loadMetadata(
  metadataPath: string
): Promise<BookMetadata> {
  const { readFile } = await import('fs/promises')
  const content = await readFile(metadataPath, 'utf-8')
  return JSON.parse(content) as BookMetadata
}
