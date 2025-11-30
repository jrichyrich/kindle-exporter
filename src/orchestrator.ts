/**
 * Main Orchestrator
 * Coordinates the entire book export workflow
 */

import ora from 'ora'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import type { ToolConfig, ExportFormat, ContentChunk } from './types.js'

// Automation
import {
  createBrowserSession,
  navigateToKindle,
  waitForPageReady,
  getCurrentPageNumber,
  isLastPage,
  navigateNextPage,
  closeBrowserSession,
  capturePage,
  createRunState,
  updateRunState,
  completeRunState,
  failRunState,
  saveRunState,
  loadRunState,
  canResume,
  type BrowserSession
} from './automation/index.js'

// Metadata
import {
  extractBookMetadata,
  addPageToMetadata,
  saveMetadata,
  type BookMetadata
} from './metadata/index.js'

// OCR
import { createOcrProvider, type OcrProviderConfig } from './ocr/index.js'

// Exporters
import { exportMultiple, type ExportOptions } from './exporters/index.js'

/**
 * Orchestrator options
 */
export interface OrchestratorOptions {
  /** Book title for folder naming */
  bookTitle?: string
  /** Amazon ASIN */
  asin?: string
  /** Export formats */
  formats: ExportFormat[]
  /** Output directory */
  outputDir: string
  /** Show browser window */
  headful?: boolean
  /** Dry run (no OCR/export) */
  dryRun?: boolean
  /** Maximum pages to capture */
  maxPages?: number
  /** Resume from previous run */
  resume?: boolean
  /** OCR options */
  ocr?: {
    engine?: string
    lang?: string
    batchSize?: number
  }
}

/**
 * Orchestrator result
 */
export interface OrchestratorResult {
  success: boolean
  bookTitle: string
  totalPages: number
  exportedFormats: ExportFormat[]
  duration: number
  error?: string
}

/**
 * Main orchestration function
 * Coordinates browser automation, OCR, metadata extraction, and export
 */
export async function orchestrateBookExport(
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const startTime = Date.now()
  const config = loadConfig()
  let session: BrowserSession | null = null
  let metadata: BookMetadata | null = null

  const spinner = ora('Initializing Kindle Exporter...').start()

  try {
    // Check for existing run
    if (options.resume && options.bookTitle) {
      const canResumeRun = await canResume(options.outputDir, options.bookTitle)
      if (canResumeRun) {
        spinner.info(
          chalk.yellow('Found existing run, attempting to resume...')
        )
      }
    }

    // Step 1: Create browser session
    spinner.text = 'Launching browser...'
    session = await createBrowserSession({
      profilePath: config.chromeProfilePath,
      executablePath: config.chromeExecutablePath,
      headful: options.headful || false
    })
    spinner.succeed('Browser launched')

    // Step 2 & 3: Extract metadata (sets up interceptors) then navigate
    spinner.start(
      'Navigating to Kindle Cloud Reader and extracting metadata...'
    )

    // Start metadata extraction (which sets up network interceptors)
    const metadataPromise = extractBookMetadata(
      session.page,
      options.asin || 'unknown'
    )

    // Navigate to Kindle (this will trigger the metadata capture)
    await navigateToKindle(session.page, options.asin)

    // Wait for metadata extraction to complete
    metadata = await metadataPromise

    const bookTitle = options.bookTitle || metadata.meta.title
    spinner.succeed(`Book: ${chalk.cyan(bookTitle)}`)

    // Step 4: Initialize or load run state
    const existingState = await loadRunState(options.outputDir, bookTitle)
    let runState =
      existingState ||
      createRunState(
        bookTitle,
        options.asin,
        'ocr',
        (options.ocr?.engine as any) || config.ocrEngine
      )

    // Step 5: Capture pages
    spinner.start('Capturing pages...')
    const { pages, contentChunks } = await captureAndOcrPages(
      session,
      config,
      options,
      metadata,
      runState.lastPage || 0,
      spinner // Pass spinner for progress updates
    )

    runState = updateRunState(runState, {
      totalPages: pages.length,
      exportedPages: pages.length
    })

    spinner.succeed(`Captured ${chalk.green(pages.length)} pages`)

    // Save metadata with pages
    const sanitizedTitle = bookTitle
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 200)
    const metadataPath = `${options.outputDir}/${sanitizedTitle}/metadata.json`
    await saveMetadata(metadata, metadataPath)

    // Step 6: Export to requested formats
    if (!options.dryRun && options.formats.length > 0) {
      spinner.start('Exporting book...')

      const exportOptions: ExportOptions = {
        outputDir: options.outputDir,
        bookTitle,
        includeMetadata: true
      }

      const results = await exportMultiple(
        contentChunks,
        metadata,
        options.formats,
        exportOptions
      )

      const successful = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      if (successful.length > 0) {
        spinner.succeed(
          `Exported to ${chalk.green(successful.length)} format(s): ${successful.map((r) => r.format).join(', ')}`
        )
      }

      if (failed.length > 0) {
        spinner.warn(
          `Failed to export ${failed.length} format(s): ${failed.map((r) => r.format).join(', ')}`
        )
      }
    }

    // Step 7: Mark run as complete
    runState = completeRunState(runState)
    await saveRunState(runState, options.outputDir)

    spinner.succeed(chalk.green.bold('✨ Export complete!'))

    return {
      success: true,
      bookTitle,
      totalPages: pages.length,
      exportedFormats: options.formats,
      duration: Date.now() - startTime
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    spinner.fail(chalk.red(`Export failed: ${errorMessage}`))

    // Save failed state
    if (metadata && options.bookTitle) {
      const runState = failRunState(
        createRunState(
          options.bookTitle,
          options.asin,
          'ocr',
          config.ocrEngine
        ),
        errorMessage
      )
      await saveRunState(runState, options.outputDir)
    }

    return {
      success: false,
      bookTitle: options.bookTitle || 'Unknown',
      totalPages: 0,
      exportedFormats: [],
      duration: Date.now() - startTime,
      error: errorMessage
    }
  } finally {
    // Always clean up browser
    if (session) {
      await closeBrowserSession(session)
    }
  }
}

/**
 * Capture pages and perform OCR
 */
async function captureAndOcrPages(
  session: BrowserSession,
  config: ToolConfig,
  options: OrchestratorOptions,
  metadata: BookMetadata,
  startPage: number,
  spinner: any // ora spinner for progress updates
) {
  const pages: ContentChunk[] = []
  let pageNumber = startPage || 1
  const startTime = Date.now()

  // Create OCR provider
  const ocrConfig: OcrProviderConfig = {
    engine: (options.ocr?.engine as any) || config.ocrEngine,
    lang: options.ocr?.lang || config.ocrLang,
    batchSize: options.ocr?.batchSize || 4
  }
  const ocrProvider = await createOcrProvider(ocrConfig)

  // Navigate to start page if resuming
  if (startPage > 1) {
    for (let i = 1; i < startPage; i++) {
      await navigateNextPage(session.page, config)
    }
  }

  // Capture loop
  while (true) {
    // Wait for page to be ready
    await waitForPageReady(session.page)

    // Get current page number
    const currentPage = (await getCurrentPageNumber(session.page)) || pageNumber

    // Capture screenshot (use CLI bookTitle if provided, otherwise metadata title)
    const bookTitle = options.bookTitle || metadata.meta.title
    const pageChunk = await capturePage(session.page, currentPage, {
      outputDir: options.outputDir,
      bookTitle,
      quality: 90,
      format: 'png'
    })

    // Perform OCR (unless dry run)
    let text = ''
    if (!options.dryRun) {
      text = await ocrProvider.ocr(pageChunk.screenshot)
    }

    // Create content chunk
    const contentChunk: ContentChunk = {
      ...pageChunk,
      text
    }

    pages.push(contentChunk)

    // Add to metadata
    addPageToMetadata(
      metadata,
      pageChunk.index,
      pageChunk.page,
      pageChunk.screenshot
    )

    // Update progress display
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const avgTimePerPage = (Date.now() - startTime) / pages.length / 1000
    const progressText = options.maxPages
      ? `Page ${pages.length}/${options.maxPages} | ${elapsed}s elapsed | ${avgTimePerPage.toFixed(1)}s/page avg`
      : `Page ${pages.length} | ${elapsed}s elapsed | ${avgTimePerPage.toFixed(1)}s/page avg`

    spinner.text = chalk.cyan(progressText)

    // Check if we should stop
    const shouldStop =
      (options.maxPages && pages.length >= options.maxPages) ||
      (await isLastPage(session.page))

    if (shouldStop) {
      break
    }

    // Navigate to next page
    const success = await navigateNextPage(session.page, config)
    if (!success) {
      break
    }

    pageNumber++
  }

  return { pages, contentChunks: pages }
}
