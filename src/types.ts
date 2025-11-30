/**
 * Core type definitions for Kindle Exporter
 * Combines types from both source repositories
 */

// ============================================================================
// Capture & Export Types
// ============================================================================

export type CaptureMode = 'ocr' | 'pdf' | 'pdf-ocr'

export type ExportFormat =
  | 'text'
  | 'pdf'
  | 'pdf-ocr'
  | 'markdown'
  | 'epub'
  | 'audio'

export type OcrEngine = 'livetext' | 'tesseract' | 'openai' | 'local-vision'

export type OcrLang = string | undefined

// ============================================================================
// OCR Provider Interface
// ============================================================================

export interface OcrOptions {
  lang?: string
  temperature?: number
  maxRetries?: number
  batchSize?: number
}

export interface OcrProvider {
  engine: OcrEngine
  ocr(imagePath: string, options?: OcrOptions): Promise<string>
  ocrBatch?(imagePaths: string[], options?: OcrOptions): Promise<string[]>
  estimateCost?(pageCount: number): number
}

// ============================================================================
// Book Metadata Types (from public repo)
// ============================================================================

export interface BookMetadata {
  meta: AmazonBookMeta
  info: AmazonBookInfo
  nav: Nav
  toc: TocItem[]
  pages: PageChunk[]
  locationMap: AmazonRenderLocationMap
}

export interface AmazonBookMeta {
  ACR: string
  asin: string
  authorList: string[]
  bookSize: string
  bookType: string
  cover: string
  language: string
  positions: {
    cover: number
    srl: number
    toc: number
  }
  publisher: string
  refEmId: string
  releaseDate: string
  sample: boolean
  title: string
  version: string
  startPosition: number
  endPosition: number
}

export interface AmazonBookInfo {
  clippingLimit: number
  contentChecksum: any
  contentType: string
  contentVersion: string
  deliveredAsin: string
  downloadRestrictionReason: any
  expirationDate: any
  format: string
  formatVersion: string
  fragmentMapUrl: any
  hasAnnotations: boolean
  isOwned: boolean
  isSample: boolean
  kindleSessionId: string
  lastPageReadData: {
    deviceName: string
    position: number
    syncTime: number
  }
  manifestUrl: any
  originType: string
  pageNumberUrl: any
  requestedAsin: string
  srl: number
}

export interface Nav {
  startPosition: number
  endPosition: number
  startContentPosition: number
  startContentPage: number
  endContentPosition: number
  endContentPage: number
  totalNumPages: number
  totalNumContentPages: number
}

export interface TocItem {
  label: string
  positionId: number
  page?: number
  location?: number
  depth: number
}

export interface PageChunk {
  index: number
  page: number
  screenshot: string
}

export interface ContentChunk {
  index: number
  page: number
  text: string
  screenshot: string
}

export interface AmazonRenderLocationMap {
  locations: number[]
  navigationUnit: Array<{
    startPosition: number
    page: number
    label: string
  }>
}

export type AmazonRenderToc = Array<AmazonRenderTocItem>

export interface AmazonRenderTocItem {
  label: string
  tocPositionId: number
  entries?: AmazonRenderTocItem[]
}

// ============================================================================
// Run State Types (from private repo)
// ============================================================================

export type RunStatus = 'in-progress' | 'completed' | 'failed'

export interface RunState {
  version: string
  bookTitle: string
  asin?: string
  startTime: string
  endTime?: string
  status: RunStatus
  lastPage: number
  totalPages?: number
  exportedPages: number
  captureMode: CaptureMode
  ocrProvider: OcrEngine
  ocrLang?: string
  stopReason?: string
  ocrFailures: number
  metadata?: {
    extracted: boolean
    author?: string[]
    title?: string
    publisher?: string
    releaseDate?: string
    hasToc: boolean
    tocLength?: number
  }
  stats?: {
    screenshotTime: number
    ocrTime: number
    totalTime: number
    avgTimePerPage: number
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ToolConfig {
  chromeProfilePath: string
  outputDir: string
  delayMinMs: number
  delayMaxMs: number
  ocrEngine: OcrEngine
  ocrLang?: string
  chromeExecutablePath?: string
  // Local vision model config
  localVisionModel?: string
  localVisionQuantization?: '4bit' | '8bit' | 'fp16' | 'none'
  localVisionDevice?: 'auto' | 'cuda' | 'mps' | 'cpu'
  localVisionCacheDir?: string
  localVisionBatchSize?: number
}

// ============================================================================
// CLI Options Types
// ============================================================================

export interface CliOptions {
  bookTitle?: string
  asin?: string
  dryRun: boolean
  maxPages?: number
  resumePage?: number
  captureMode: CaptureMode
  format?: ExportFormat | ExportFormat[]
  ocrLang?: string
  batchOcr?: boolean
  ocrConcurrency?: number
  headful?: boolean
  openFolder?: boolean
  widenReader?: boolean
  widenZoom?: number
  jsonLogs?: boolean
}

// ============================================================================
// Browser Session Types
// ============================================================================

export interface BrowserSession {
  browser: any // Playwright Browser
  context: any // Playwright BrowserContext
  page: any // Playwright Page
}

// ============================================================================
// Export Result Types
// ============================================================================

export interface ExportResult {
  success: boolean
  bookFolder: string
  exportedPages: number
  totalPages: number
  exportedFormats: ExportFormat[]
  duration: number
  errors?: string[]
}
