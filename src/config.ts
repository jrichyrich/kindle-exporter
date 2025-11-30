/**
 * Configuration management with Zod validation
 * Combines config patterns from both source repositories
 */

import { randomInt } from 'crypto'
import path from 'path'
import { z } from 'zod'
import type { OcrEngine, ToolConfig } from './types.js'

// Determine default OCR engine based on platform
const defaultOcrEngine: OcrEngine =
  process.platform === 'darwin' ? 'livetext' : 'tesseract'

// Configuration schema with validation
const configSchema = z.object({
  chromeProfilePath: z
    .string()
    .min(1, 'Set CHROME_PROFILE_PATH to your Chrome profile directory.'),
  outputDir: z.string().default(path.resolve(process.cwd(), 'exports')),
  delayMinMs: z.number().int().positive().default(3000),
  delayMaxMs: z.number().int().positive().default(5000),
  ocrEngine: z
    .enum(['livetext', 'tesseract', 'openai', 'local-vision'])
    .default(defaultOcrEngine),
  ocrLang: z
    .string()
    .optional()
    .transform((val) =>
      val && val.trim().length > 0 ? val.trim() : undefined
    ),
  chromeExecutablePath: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  // Local vision model configuration
  localVisionModel: z.string().optional().default('qwen2-vl-7b'),
  localVisionQuantization: z
    .enum(['4bit', '8bit', 'fp16', 'none'])
    .optional()
    .default('4bit'),
  localVisionDevice: z
    .enum(['auto', 'cuda', 'mps', 'cpu'])
    .optional()
    .default('auto'),
  localVisionCacheDir: z
    .string()
    .optional()
    .default(
      path.join(process.env.HOME || '~', '.cache', 'kindle-exporter', 'models')
    ),
  localVisionBatchSize: z.number().int().positive().optional().default(4)
})

/**
 * Load and validate configuration from environment variables
 */
export const loadConfig = (): ToolConfig => {
  const parsed = configSchema.safeParse({
    chromeProfilePath: process.env.CHROME_PROFILE_PATH,
    outputDir: process.env.OUTPUT_DIR,
    delayMinMs: process.env.DELAY_MIN_MS
      ? Number(process.env.DELAY_MIN_MS)
      : undefined,
    delayMaxMs: process.env.DELAY_MAX_MS
      ? Number(process.env.DELAY_MAX_MS)
      : undefined,
    ocrEngine: process.env.OCR_ENGINE,
    ocrLang: process.env.OCR_LANG,
    chromeExecutablePath: process.env.CHROME_EXECUTABLE_PATH,
    localVisionModel: process.env.LOCAL_VISION_MODEL,
    localVisionQuantization: process.env.LOCAL_VISION_QUANTIZATION,
    localVisionDevice: process.env.LOCAL_VISION_DEVICE,
    localVisionCacheDir: process.env.LOCAL_VISION_CACHE_DIR,
    localVisionBatchSize: process.env.LOCAL_VISION_BATCH_SIZE
      ? Number(process.env.LOCAL_VISION_BATCH_SIZE)
      : undefined
  })

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((err) => err.message).join('\n'))
  }

  return parsed.data
}

/**
 * Get a random delay in human-like range
 * Helps avoid detection/rate-limiting
 */
export const getHumanDelay = (config: ToolConfig): number => {
  const min = config.delayMinMs
  const max = Math.max(config.delayMaxMs, min + 500)
  return randomInt(min, max)
}

/**
 * Validate OCR engine is available on current platform
 */
export const validateOcrEngine = (engine: OcrEngine): void => {
  if (engine === 'livetext' && process.platform !== 'darwin') {
    throw new Error('Live Text OCR is only available on macOS')
  }
}

/**
 * Get recommended OCR engine for current platform
 */
export const getRecommendedOcrEngine = (): OcrEngine => {
  if (process.platform === 'darwin') {
    return 'livetext' // Fast and accurate on macOS
  }
  return 'tesseract' // Cross-platform fallback
}

/**
 * Estimate disk space required for local vision model
 */
export const estimateModelDiskSpace = (
  modelName: string,
  quantization: string
): number => {
  const modelSizes: Record<string, Record<string, number>> = {
    'qwen2-vl-7b': {
      '4bit': 4000, // MB
      '8bit': 7000,
      fp16: 14000,
      none: 28000
    },
    'qwen2-vl-72b': {
      '8bit': 72000,
      fp16: 144000,
      none: 288000
    },
    'llama-3.2-vision-11b': {
      '4bit': 6000,
      '8bit': 11000,
      fp16: 22000,
      none: 44000
    },
    'pixtral-12b': {
      '4bit': 6500,
      '8bit': 12000,
      fp16: 24000,
      none: 48000
    }
  }

  return modelSizes[modelName]?.[quantization] || 0
}
