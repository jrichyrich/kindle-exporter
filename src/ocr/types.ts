/**
 * OCR Provider Types and Interfaces
 * Defines the contract that all OCR providers must implement
 */

import type { OcrEngine } from '../types.js'

/**
 * OCR options for providers
 */
export interface OcrOptions {
  lang?: string
  temperature?: number
  maxRetries?: number
  batchSize?: number
}

/**
 * Base interface that all OCR providers must implement
 */
export interface OcrProvider {
  /** Unique engine identifier */
  readonly engine: OcrEngine

  /**
   * Perform OCR on a single image
   * @param imagePath - Absolute path to the image file
   * @param options - Optional OCR configuration
   * @returns Extracted text from the image
   */
  ocr(imagePath: string, options?: OcrOptions): Promise<string>

  /**
   * Perform OCR on multiple images in batch (optional optimization)
   * @param imagePaths - Array of absolute paths to image files
   * @param options - Optional OCR configuration
   * @returns Array of extracted text corresponding to each image
   */
  ocrBatch?(imagePaths: string[], options?: OcrOptions): Promise<string[]>

  /**
   * Estimate the cost of OCR for a given number of pages (if applicable)
   * @param pageCount - Number of pages to estimate
   * @returns Estimated cost in USD, or 0 if free
   */
  estimateCost?(pageCount: number): number

  /**
   * Check if this provider is available on the current system
   * @returns True if the provider can be used
   */
  isAvailable?(): Promise<boolean>

  /**
   * Initialize the provider (e.g., download models, check dependencies)
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>

  /**
   * Clean up resources (e.g., unload models, close connections)
   */
  cleanup?(): Promise<void>
}

/**
 * OCR provider factory configuration
 */
export interface OcrProviderConfig {
  engine: OcrEngine
  lang?: string
  apiKey?: string
  modelName?: string
  quantization?: '4bit' | '8bit' | 'fp16' | 'none'
  device?: 'auto' | 'cuda' | 'mps' | 'cpu'
  batchSize?: number
  temperature?: number
  maxRetries?: number
}

/**
 * OCR result with metadata
 */
export interface OcrResult {
  text: string
  confidence?: number
  processingTime?: number
  error?: string
}

/**
 * OCR provider metadata
 */
export interface OcrProviderInfo {
  engine: OcrEngine
  name: string
  description: string
  platforms: string[]
  accuracy: string
  speed: string
  cost: string
  requirements: string[]
}

/**
 * Batch OCR progress callback
 */
export type OcrProgressCallback = (
  completed: number,
  total: number,
  currentFile: string
) => void

/**
 * OCR error types
 */
export class OcrError extends Error {
  constructor(
    message: string,
    public readonly engine: OcrEngine,
    public readonly imagePath?: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'OcrError'
  }
}

/**
 * Provider not available error
 */
export class ProviderNotAvailableError extends OcrError {
  constructor(engine: OcrEngine, reason: string) {
    super(`OCR provider '${engine}' is not available: ${reason}`, engine)
    this.name = 'ProviderNotAvailableError'
  }
}

/**
 * OCR processing error
 */
export class OcrProcessingError extends OcrError {
  constructor(engine: OcrEngine, imagePath: string, cause: Error) {
    super(
      `Failed to process image with ${engine}: ${cause.message}`,
      engine,
      imagePath,
      cause
    )
    this.name = 'OcrProcessingError'
  }
}
