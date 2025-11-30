/**
 * OpenAI Vision OCR Provider
 * Uses GPT-4 Vision for high-accuracy text recognition
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { OpenAIClient } from 'openai-fetch'
import type { OcrProvider, OcrProviderConfig } from './types.js'
import { OcrProcessingError, ProviderNotAvailableError } from './types.js'

/**
 * OpenAI Vision provider for high-accuracy OCR
 */
export class OpenAIProvider implements OcrProvider {
  readonly engine = 'openai' as const
  private readonly apiKey: string
  private readonly model: string
  private readonly temperature: number
  private readonly maxRetries: number
  private client?: OpenAIClient

  constructor(config: OcrProviderConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || ''
    this.model = 'gpt-4o-mini' // Latest and most cost-effective vision model
    this.temperature = config.temperature ?? 0
    this.maxRetries = config.maxRetries ?? 3

    if (!this.apiKey) {
      throw new ProviderNotAvailableError(
        'openai',
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable'
      )
    }
  }

  /**
   * Initialize OpenAI client
   */
  private async getClient(): Promise<OpenAIClient> {
    if (!this.client) {
      const { OpenAIClient: Client } = await import('openai-fetch')
      this.client = new Client({
        apiKey: this.apiKey
      }) as OpenAIClient
    }
    return this.client
  }

  /**
   * Check if OpenAI is available
   */
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  /**
   * Perform OCR on a single image with retry logic
   */
  async ocr(
    imagePath: string,
    options?: { temperature?: number; maxRetries?: number }
  ): Promise<string> {
    if (!existsSync(imagePath)) {
      throw new OcrProcessingError(
        'openai',
        imagePath,
        new Error(`Image file not found: ${imagePath}`)
      )
    }

    const temperature = options?.temperature ?? this.temperature
    const maxRetries = options?.maxRetries ?? this.maxRetries

    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Adjust temperature on retries to reduce refusals
        const currentTemp = temperature + attempt * 0.2

        const text = await this.performOcr(imagePath, currentTemp)

        // Check if we got actual content (not a refusal)
        if (text && text.length > 0 && !this.isRefusal(text)) {
          return text
        }

        // If we got a refusal, retry with higher temperature
        lastError = new Error('OpenAI refused to process the image')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on certain errors
        if (this.isFatalError(lastError)) {
          break
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        )
      }
    }

    throw new OcrProcessingError(
      'openai',
      imagePath,
      lastError || new Error('Failed to process image after retries')
    )
  }

  /**
   * Perform the actual OCR request
   */
  private async performOcr(
    imagePath: string,
    temperature: number
  ): Promise<string> {
    const client = await this.getClient()

    // Read image and convert to base64
    const imageBuffer = await readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = this.getMimeType(imagePath)

    // Create the request
    const response = await client.createChatCompletion({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an OCR system. Extract all text from images exactly as it appears. Output only the text content, nothing else. Preserve formatting and line breaks.'
        },
        {
          role: 'user',
          content: `Extract all text from this image.\n\n![Image](data:${mimeType};base64,${base64Image})`
        }
      ],
      temperature,
      max_tokens: 4096
    })

    return response.choices[0]?.message?.content?.trim() || ''
  }

  /**
   * Check if the response is a refusal
   */
  private isRefusal(text: string): boolean {
    const refusalPatterns = [
      /cannot.*process.*image/i,
      /unable.*to.*read/i,
      /cannot.*extract.*text/i,
      /no.*text.*found/i,
      /image.*does.*not.*contain/i
    ]

    return refusalPatterns.some((pattern) => pattern.test(text))
  }

  /**
   * Check if error is fatal (shouldn't retry)
   */
  private isFatalError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('api key') ||
      message.includes('unauthorized') ||
      message.includes('invalid') ||
      message.includes('quota')
    )
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(imagePath: string): string {
    const ext = imagePath.toLowerCase().split('.').pop()
    switch (ext) {
      case 'png':
        return 'image/png'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      default:
        return 'image/png' // Default
    }
  }

  /**
   * Perform OCR on multiple images
   */
  async ocrBatch(
    imagePaths: string[],
    options?: { temperature?: number; maxRetries?: number }
  ): Promise<string[]> {
    // Process in parallel with rate limiting
    const results: string[] = []
    const concurrency = 5 // OpenAI allows reasonable parallel requests

    for (let i = 0; i < imagePaths.length; i += concurrency) {
      const batch = imagePaths.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map((path) => this.ocr(path, options))
      )
      results.push(...batchResults)

      // Small delay between batches to avoid rate limits
      if (i + concurrency < imagePaths.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * Estimate cost for OCR
   * Based on gpt-4o-mini pricing: ~$0.15 per 1M input tokens
   * Average image: ~1000 tokens, average output: ~500 tokens
   */
  estimateCost(pageCount: number): number {
    const inputTokensPerPage = 1000 // Average for image
    const outputTokensPerPage = 500 // Average OCR output
    const inputCostPer1M = 0.15
    const outputCostPer1M = 0.6

    const inputCost =
      (pageCount * inputTokensPerPage * inputCostPer1M) / 1_000_000
    const outputCost =
      (pageCount * outputTokensPerPage * outputCostPer1M) / 1_000_000

    return inputCost + outputCost
  }
}
