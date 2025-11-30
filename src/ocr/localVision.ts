/**
 * Local Vision Model OCR Provider
 * Uses local GPU-accelerated vision models for OCR
 * Supports: Qwen2-VL, LLaMA 3.2 Vision, Pixtral
 */

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { Ollama } from 'ollama'
import type { OcrProvider, OcrProviderConfig } from './types.js'
import { OcrProcessingError, ProviderNotAvailableError } from './types.js'

/**
 * Supported vision models
 */
export type VisionModel =
  | 'qwen2-vl-7b'
  | 'qwen2-vl-72b'
  | 'llama-3.2-vision-11b'
  | 'llama-3.2-vision-90b'
  | 'pixtral-12b'

/**
 * Quantization options
 */
export type Quantization = '4bit' | '8bit' | 'fp16' | 'none'

/**
 * Device options
 */
export type Device = 'auto' | 'cuda' | 'mps' | 'cpu'

/**
 * Model configuration
 */
interface ModelConfig {
  name: VisionModel
  quantization: Quantization
  device: Device
  batchSize: number
  cacheDir: string
  maxRetries: number
  retryDelay: number // Base delay in ms
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number // Reset timeout in ms
}

/**
 * Model information
 */
interface ModelInfo {
  size: Record<Quantization, number> // Size in MB
  minRAM: number // Minimum RAM in GB
  accuracy: string
  speed: string
}

/**
 * OCR statistics
 */
interface OcrStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  retriedRequests: number
  totalRetries: number
  totalDuration: number // in ms
  averageDuration: number // in ms
  errors: Map<string, number> // Error type -> count
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker
 */
interface CircuitBreaker {
  state: CircuitState
  failureCount: number
  lastFailureTime: number
  nextAttemptTime: number
}

/**
 * Model registry
 */
const MODEL_INFO: Record<VisionModel, ModelInfo> = {
  'qwen2-vl-7b': {
    size: { '4bit': 4000, '8bit': 7000, fp16: 14000, none: 28000 },
    minRAM: 8,
    accuracy: '96-98%',
    speed: 'Fast (1-4s/page)'
  },
  'qwen2-vl-72b': {
    size: { '4bit': 0, '8bit': 72000, fp16: 144000, none: 288000 },
    minRAM: 80,
    accuracy: '98-99%',
    speed: 'Slow (5-15s/page)'
  },
  'llama-3.2-vision-11b': {
    size: { '4bit': 6000, '8bit': 11000, fp16: 22000, none: 44000 },
    minRAM: 12,
    accuracy: '95-97%',
    speed: 'Medium (2-6s/page)'
  },
  'llama-3.2-vision-90b': {
    size: { '4bit': 0, '8bit': 90000, fp16: 180000, none: 360000 },
    minRAM: 90,
    accuracy: '98-99%',
    speed: 'Very Slow (10-30s/page)'
  },
  'pixtral-12b': {
    size: { '4bit': 6500, '8bit': 12000, fp16: 24000, none: 48000 },
    minRAM: 12,
    accuracy: '96-98%',
    speed: 'Fast (1.5-5s/page)'
  }
}

/**
 * Local Vision Model provider
 */
export class LocalVisionProvider implements OcrProvider {
  readonly engine = 'local-vision' as const
  private readonly config: ModelConfig
  private readonly ollama: Ollama
  private isInitialized = false
  private readonly stats: OcrStats
  private readonly circuitBreaker: CircuitBreaker

  constructor(providerConfig: OcrProviderConfig) {
    const modelName = (providerConfig.modelName as VisionModel) || 'qwen2-vl-7b'
    const quantization = providerConfig.quantization || '4bit'
    const device = providerConfig.device || 'auto'
    const batchSize = providerConfig.batchSize || 4
    const cacheDir =
      process.env.LOCAL_VISION_CACHE_DIR ||
      join(homedir(), '.cache', 'kindle-exporter', 'models')

    this.config = {
      name: modelName,
      quantization,
      device,
      batchSize,
      cacheDir,
      maxRetries: 3,
      retryDelay: 1000, // 1 second base delay
      circuitBreakerThreshold: 5, // Open circuit after 5 failures
      circuitBreakerTimeout: 60000 // Reset after 1 minute
    }

    // Initialize Ollama client
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    })

    // Initialize stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      totalRetries: 0,
      totalDuration: 0,
      averageDuration: 0,
      errors: new Map()
    }

    // Initialize circuit breaker
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    }
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Ollama is running by listing models
      const models = await this.ollama.list()
      const modelName = this.getOllamaModelName()

      // Check if our specific model exists
      return models.models.some((m) => m.name === modelName)
    } catch {
      // Ollama not running or not accessible
      return false
    }
  }

  /**
   * Initialize the model (download if needed)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // Check if Ollama is running
    try {
      await this.ollama.list()
    } catch {
      throw new ProviderNotAvailableError(
        'local-vision',
        'Ollama is not running. Start it with: ollama serve\n' +
          'Install from: https://ollama.com'
      )
    }

    // Check if model exists
    const available = await this.isAvailable()
    if (!available) {
      const modelName = this.getOllamaModelName()
      throw new ProviderNotAvailableError(
        'local-vision',
        `Model '${modelName}' not found. Download it with:\n` +
          `  ollama pull ${modelName}\n\n` +
          `This will download ~4GB and requires 8GB+ RAM.`
      )
    }

    this.isInitialized = true
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(): void {
    const now = Date.now()

    // If circuit is open, check if we should try again
    if (this.circuitBreaker.state === CircuitState.OPEN) {
      if (now >= this.circuitBreaker.nextAttemptTime) {
        // Move to half-open state to test if service recovered
        this.circuitBreaker.state = CircuitState.HALF_OPEN
        this.circuitBreaker.failureCount = 0
      } else {
        throw new OcrProcessingError(
          'local-vision',
          'circuit-breaker',
          new Error(
            `Circuit breaker is OPEN. Retry in ${Math.ceil((this.circuitBreaker.nextAttemptTime - now) / 1000)}s`
          )
        )
      }
    }
  }

  /**
   * Record successful OCR request
   */
  private recordSuccess(duration: number): void {
    this.stats.successfulRequests++
    this.stats.totalDuration += duration
    this.stats.averageDuration =
      this.stats.totalDuration / this.stats.successfulRequests

    // Reset circuit breaker on success
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.state = CircuitState.CLOSED
    }
    this.circuitBreaker.failureCount = 0
  }

  /**
   * Record failed OCR request
   */
  private recordFailure(error: Error): void {
    this.stats.failedRequests++
    this.circuitBreaker.failureCount++
    this.circuitBreaker.lastFailureTime = Date.now()

    // Track error types
    const errorType = error.message.split(':')[0] || 'unknown'
    this.stats.errors.set(
      errorType,
      (this.stats.errors.get(errorType) || 0) + 1
    )

    // Open circuit breaker if threshold reached
    if (
      this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold
    ) {
      this.circuitBreaker.state = CircuitState.OPEN
      this.circuitBreaker.nextAttemptTime =
        Date.now() + this.config.circuitBreakerTimeout
    }
  }

  /**
   * Sleep for specified duration
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Perform OCR on a single image
   */
  async ocr(imagePath: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!existsSync(imagePath)) {
      throw new OcrProcessingError(
        'local-vision',
        imagePath,
        new Error(`Image file not found: ${imagePath}`)
      )
    }

    // Check circuit breaker
    this.checkCircuitBreaker()

    // Increment total requests
    this.stats.totalRequests++

    const startTime = Date.now()
    let lastError: Error | null = null
    let retryCount = 0

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Read image and convert to base64
        const imageBuffer = await readFile(imagePath)
        const base64Image = imageBuffer.toString('base64')

        // Call Ollama with vision model
        const response = await this.ollama.chat({
          model: this.getOllamaModelName(),
          messages: [
            {
              role: 'user',
              content:
                'Extract all text from this image exactly as it appears. Output only the text content, nothing else. Preserve formatting and line breaks.',
              images: [base64Image]
            }
          ],
          options: {
            temperature: 0, // Deterministic output for OCR
            num_predict: 4096 // Max tokens for output
          }
        })

        const text = response.message.content.trim()
        const duration = Date.now() - startTime

        // Record success
        this.recordSuccess(duration)

        // Track retries
        if (retryCount > 0) {
          this.stats.retriedRequests++
        }

        return text
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        retryCount++
        this.stats.totalRetries++

        // If this was the last attempt, record failure and throw
        if (attempt === this.config.maxRetries) {
          this.recordFailure(lastError)
          throw new OcrProcessingError('local-vision', imagePath, lastError)
        }

        // Calculate exponential backoff: baseDelay * 2^attempt
        const backoffDelay = this.config.retryDelay * Math.pow(2, attempt)

        // Wait before retrying
        await this.sleep(backoffDelay)
      }
    }

    // This should never be reached, but TypeScript requires it
    this.recordFailure(lastError!)
    throw new OcrProcessingError('local-vision', imagePath, lastError!)
  }

  /**
   * Perform OCR on multiple images (optimized batch processing)
   */
  async ocrBatch(imagePaths: string[]): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const results: string[] = []
    const batchSize = this.config.batchSize

    // Process in batches for efficiency
    for (let i = 0; i < imagePaths.length; i += batchSize) {
      const batch = imagePaths.slice(i, i + batchSize)

      // TODO: Implement actual batch inference
      // For now, fall back to sequential processing
      const batchResults = await Promise.all(
        batch.map((path) => this.ocr(path))
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Local models are free (but require disk space)
   */
  estimateCost(_pageCount: number): number {
    return 0 // Free!
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // TODO: Unload model from memory
    this.isInitialized = false
  }

  /**
   * Get the Ollama model name based on internal model name
   */
  private getOllamaModelName(): string {
    const modelMap: Record<VisionModel, string> = {
      'qwen2-vl-7b': 'qwen2.5vl:7b',
      'qwen2-vl-72b': 'qwen2.5vl:72b',
      'llama-3.2-vision-11b': 'llama3.2-vision:11b',
      'llama-3.2-vision-90b': 'llama3.2-vision:90b',
      'pixtral-12b': 'pixtral:12b'
    }

    return modelMap[this.config.name] || 'qwen2.5vl:7b'
  }

  /**
   * Get model information
   */
  getModelInfo(): ModelInfo {
    return MODEL_INFO[this.config.name]
  }

  /**
   * Get estimated disk space required
   */
  getEstimatedDiskSpace(): number {
    const info = this.getModelInfo()
    return info.size[this.config.quantization]
  }

  /**
   * Get device being used
   */
  getDevice(): Device {
    return this.config.device
  }

  /**
   * Get OCR statistics
   */
  getStats(): OcrStats {
    return {
      ...this.stats,
      errors: new Map(this.stats.errors) // Return a copy
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: CircuitState
    failureCount: number
    isOpen: boolean
  } {
    return {
      state: this.circuitBreaker.state,
      failureCount: this.circuitBreaker.failureCount,
      isOpen: this.circuitBreaker.state === CircuitState.OPEN
    }
  }

  /**
   * Check if GPU is available
   */
  static async checkGPUAvailability(): Promise<{
    cuda: boolean
    mps: boolean
  }> {
    // TODO: Implement GPU detection
    // This would check:
    // - NVIDIA GPU (CUDA) availability
    // - Apple Silicon (MPS) availability
    return {
      cuda: false,
      mps: process.platform === 'darwin' // Assume MPS on macOS
    }
  }
}

/**
 * Export model information for CLI commands
 */
export { MODEL_INFO }
