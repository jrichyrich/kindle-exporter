#!/usr/bin/env node
/**
 * Main CLI entry point for Kindle Exporter
 * Unified command-line interface combining features from both source repos
 */

import { Command } from 'commander'
import chalk from 'chalk'
import dotenv from 'dotenv'
import {
  orchestrateBookExport,
  type OrchestratorOptions
} from './orchestrator.js'
import type { ExportFormat } from './types.js'

// Load environment variables
dotenv.config()

const program = new Command()

program
  .name('kindle-exporter')
  .description(
    'Export any Kindle book you own as text, PDF, EPUB, Markdown, or as a custom AI-narrated audiobook.'
  )
  .version('0.1.0')
  .option('-b, --book-title <title>', 'Book title for folder naming')
  .option('-a, --asin <asin>', 'Amazon ASIN for automatic book selection')

  .option('-o, --output <path>', 'Export directory (default: ./exports)')
  .option(
    '-f, --format <format>',
    'Export format: text|pdf|pdf-ocr|markdown|epub|audio (can specify multiple comma-separated)',
    'text'
  )

  .option(
    '--ocr <engine>',
    'OCR engine: livetext|tesseract|openai|local-vision (default: auto)'
  )
  .option('--lang <lang>', 'OCR language(s) for tesseract (e.g., eng+deu)')
  .option('--batch-ocr', 'OCR all PNGs after capture (faster)', false)
  .option(
    '--ocr-concurrency <count>',
    'Parallel OCR workers (default: 4)',
    parseInt
  )

  // Local Vision Model Options
  .option(
    '--vision-model <model>',
    'Vision model: qwen2-vl-7b|qwen2-vl-72b|llama-3.2-vision-11b|pixtral-12b'
  )
  .option(
    '--vision-quantization <quant>',
    'Quantization: 4bit|8bit|fp16|none (default: 4bit)'
  )
  .option(
    '--vision-device <device>',
    'Device: auto|cuda|mps|cpu (default: auto)'
  )
  .option(
    '--vision-batch-size <count>',
    'Batch size for vision model inference (default: 4)',
    parseInt
  )

  .option('-p, --profile <path>', 'Chrome profile path (overrides env)')
  .option('--chrome-binary <path>', 'Chrome executable path')

  .option('--headful', 'Show browser window', false)
  .option(
    '--manual-setup',
    'Wait for user to manually position book before capturing',
    false
  )
  .option('--dry-run', 'Skip screenshot/OCR, test navigation only', false)
  .option('--max-pages <count>', 'Limit export to first N pages', parseInt)
  .option('--resume-from <page>', 'Resume from specific page number', parseInt)

  .option('--metadata-only', 'Extract metadata without capturing pages', false)
  .option('--no-metadata', 'Skip metadata extraction')

  .option('--tts-engine <engine>', 'TTS engine for audio: openai|unrealspeech')
  .option('--tts-voice <voice>', 'TTS voice ID')

  .option('--json-logs', 'Emit structured JSON logs', false)
  .option('--no-prompt', 'Skip interactive prompts (use defaults)', true)
  .option('--open-folder', 'Open export folder when done (macOS only)', false)

  .option('--widen-reader', 'Attempt to widen the Kindle reading canvas', false)
  .option(
    '--widen-zoom <factor>',
    'Custom zoom factor when using --widen-reader',
    parseFloat
  )

program.parse(process.argv)

const options = program.opts()

/**
 * Parse export format string into array of ExportFormat
 */
function parseFormats(formatStr: string): ExportFormat[] {
  const formats = formatStr.split(',').map((f) => f.trim().toLowerCase())
  const validFormats: ExportFormat[] = []

  for (const format of formats) {
    if (
      format === 'text' ||
      format === 'pdf' ||
      format === 'pdf-ocr' ||
      format === 'markdown' ||
      format === 'epub' ||
      format === 'audio'
    ) {
      validFormats.push(format as ExportFormat)
    } else {
      console.warn(
        chalk.yellow(`Warning: Unknown format "${format}" - ignoring`)
      )
    }
  }

  return validFormats
}

/**
 * Main CLI execution
 */
async function main() {
  console.log(chalk.bold.cyan('\n📚 Kindle Exporter v0.1.0-alpha\n'))

  // Validate required options
  if (!options.bookTitle && !options.asin) {
    console.error(
      chalk.red('Error: Either --book-title or --asin must be specified')
    )
    process.exitCode = 1
    return
  }

  // Parse formats
  const formats = parseFormats(options.format || 'text')
  if (formats.length === 0) {
    console.error(
      chalk.red('Error: At least one valid export format is required')
    )
    process.exitCode = 1
    return
  }

  // Build orchestrator options
  const orchestratorOptions: OrchestratorOptions = {
    bookTitle: options.bookTitle,
    asin: options.asin,
    formats,
    outputDir: options.output || './exports',
    headful: options.headful || false,
    manualSetup: options.manualSetup || false,
    dryRun: options.dryRun || false,
    maxPages: options.maxPages,
    resume: options.resumeFrom !== undefined,
    ocr: {
      engine: options.ocr,
      lang: options.lang,
      batchSize: options.ocrConcurrency || 4
    }
  }

  // Display configuration
  console.log(chalk.bold('Configuration:'))
  console.log(
    chalk.gray('  Book:'),
    options.bookTitle || `ASIN ${options.asin}`
  )
  console.log(chalk.gray('  Formats:'), formats.join(', '))
  console.log(chalk.gray('  Output:'), orchestratorOptions.outputDir)
  if (orchestratorOptions.ocr?.engine) {
    console.log(chalk.gray('  OCR Engine:'), orchestratorOptions.ocr.engine)
  }
  if (orchestratorOptions.maxPages) {
    console.log(chalk.gray('  Max Pages:'), orchestratorOptions.maxPages)
  }
  console.log()

  try {
    // Run the orchestrator
    const result = await orchestrateBookExport(orchestratorOptions)

    // Display results
    if (result.success) {
      console.log()
      console.log(chalk.green.bold('✨ Export successful!'))
      console.log()
      console.log(chalk.bold('Summary:'))
      console.log(chalk.gray('  Book:'), chalk.cyan(result.bookTitle))
      console.log(chalk.gray('  Pages:'), chalk.cyan(result.totalPages))
      console.log(
        chalk.gray('  Formats:'),
        chalk.cyan(result.exportedFormats.join(', '))
      )
      console.log(
        chalk.gray('  Duration:'),
        chalk.cyan(`${(result.duration / 1000).toFixed(1)}s`)
      )
      console.log()
      console.log(
        chalk.gray('  Output:'),
        chalk.cyan(`${orchestratorOptions.outputDir}/${result.bookTitle}`)
      )
      console.log()
    } else {
      console.log()
      console.log(chalk.red.bold('❌ Export failed'))
      console.log()
      console.log(chalk.red('Error:'), result.error)
      console.log()
      process.exitCode = 1
    }
  } catch (error) {
    console.error()
    console.error(chalk.red.bold('❌ Fatal error during export'))
    console.error()
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    )
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack))
    }
    console.error()
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exitCode = 1
})
