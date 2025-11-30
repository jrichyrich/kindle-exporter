#!/usr/bin/env node
/**
 * Main CLI entry point for Kindle Exporter
 * Unified command-line interface combining features from both source repos
 */

import { Command } from 'commander'
import chalk from 'chalk'
import dotenv from 'dotenv'
import ora from 'ora'
// Import types for future use
// import type { CaptureMode, ExportFormat, OcrEngine } from './types.js'

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

// Options will be used in future implementation
// const options = program.opts()

/**
 * Main CLI execution
 */
async function main() {
  const spinner = ora(chalk.cyan('Initializing Kindle Exporter...')).start()

  try {
    // TODO: Implement actual functionality
    // This is the foundation - implementation will follow the merge plan

    spinner.info(chalk.yellow('🚧 Kindle Exporter is currently in development'))
    console.log()
    console.log(
      chalk.bold('Project Status:'),
      chalk.cyan('Phase 1 - Foundation Setup')
    )
    console.log(chalk.bold('Version:'), '0.1.0-pre-alpha')
    console.log()
    console.log(
      chalk.gray('Following the comprehensive merge plan in docs/MERGE_PLAN.md')
    )
    console.log()
    console.log(chalk.green('✓'), 'Project structure created')
    console.log(chalk.green('✓'), 'Dependencies installed')
    console.log(chalk.green('✓'), 'Base TypeScript files created')
    console.log(chalk.yellow('⧗'), 'OCR providers implementation (Phase 3)')
    console.log(chalk.yellow('⧗'), 'Metadata extraction (Phase 4)')
    console.log(chalk.yellow('⧗'), 'Export formats (Phase 5)')
    console.log()
    console.log(
      chalk.blue('Repository:'),
      'https://github.com/jrichyrich/kindle-exporter'
    )
    console.log(chalk.blue('Documentation:'), 'docs/MERGE_PLAN.md')
    console.log()

    spinner.succeed(chalk.green('Foundation setup complete!'))

    console.log()
    console.log(chalk.bold.cyan('Next Steps:'))
    console.log('  1. Complete Phase 1 (Days 1-5): Type system integration')
    console.log('  2. Phase 2-3 (Days 5-10): OCR provider integration')
    console.log('  3. Phase 4 (Days 10-14): Metadata extraction')
    console.log('  4. Phase 5-7 (Days 14-28): Export formats & UX')
    console.log('  5. Phase 8-10 (Days 28-40): Testing, docs, release')
    console.log()
  } catch (error) {
    spinner.fail(chalk.red('Error during initialization'))
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    )
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exitCode = 1
})
