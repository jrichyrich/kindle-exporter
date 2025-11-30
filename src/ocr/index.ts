/**
 * OCR Provider Factory
 * Central module for creating and managing OCR providers
 */

import type { OcrEngine } from '../types.js'
import type {
  OcrProvider,
  OcrProviderConfig,
  OcrProviderInfo
} from './types.js'
import { ProviderNotAvailableError } from './types.js'

/**
 * Create an OCR provider instance based on the engine type
 * @param config - Provider configuration
 * @returns Configured OCR provider instance
 */
export async function createOcrProvider(
  config: OcrProviderConfig
): Promise<OcrProvider> {
  const { engine } = config

  switch (engine) {
    case 'livetext': {
      const { LiveTextProvider } = await import('./livetext.js')
      const provider = new LiveTextProvider(config)
      if (!(await provider.isAvailable())) {
        throw new ProviderNotAvailableError(
          'livetext',
          'Live Text is only available on macOS 12+ with Swift 5.5+'
        )
      }
      return provider
    }

    case 'tesseract': {
      const { TesseractProvider } = await import('./tesseract.js')
      const provider = new TesseractProvider(config)
      if (!(await provider.isAvailable())) {
        throw new ProviderNotAvailableError(
          'tesseract',
          'Tesseract is not installed. Install with: brew install tesseract (macOS) or apt-get install tesseract-ocr (Linux)'
        )
      }
      return provider
    }

    case 'openai': {
      const { OpenAIProvider } = await import('./openai.js')
      const provider = new OpenAIProvider(config)
      if (!config.apiKey && !process.env.OPENAI_API_KEY) {
        throw new ProviderNotAvailableError(
          'openai',
          'OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey in config'
        )
      }
      return provider
    }

    case 'local-vision': {
      const { LocalVisionProvider } = await import('./localVision.js')
      const provider = new LocalVisionProvider(config)
      await provider.initialize()
      return provider
    }

    default:
      throw new Error(`Unknown OCR engine: ${engine}`)
  }
}

/**
 * Get information about all available OCR providers
 * @returns Array of provider information
 */
export function getAvailableProviders(): OcrProviderInfo[] {
  return [
    {
      engine: 'livetext',
      name: 'Live Text',
      description: 'macOS native OCR using Vision framework',
      platforms: ['darwin'],
      accuracy: '95-97%',
      speed: 'Fast (3-5s/page)',
      cost: 'Free',
      requirements: ['macOS 12+', 'Swift 5.5+']
    },
    {
      engine: 'tesseract',
      name: 'Tesseract',
      description: 'Open-source OCR engine',
      platforms: ['darwin', 'linux', 'win32'],
      accuracy: '90-93%',
      speed: 'Medium (5-8s/page)',
      cost: 'Free',
      requirements: ['tesseract >= 4.0']
    },
    {
      engine: 'openai',
      name: 'OpenAI Vision',
      description: 'GPT-4 Vision for high-accuracy OCR',
      platforms: ['darwin', 'linux', 'win32'],
      accuracy: '98-99%',
      speed: 'Medium (2-5s/page)',
      cost: '$1-3 per book',
      requirements: ['OpenAI API key', 'Internet connection']
    },
    {
      engine: 'local-vision',
      name: 'Local Vision Models',
      description:
        'Local GPU-accelerated vision models (Qwen2-VL, LLaMA, Pixtral)',
      platforms: ['darwin', 'linux', 'win32'],
      accuracy: '96-98%',
      speed: 'Variable (1-10s/page depending on GPU)',
      cost: 'Free (requires 4-80GB disk + GPU recommended)',
      requirements: [
        'GPU with 8GB+ VRAM (recommended)',
        'CUDA 11.8+ (NVIDIA) or Metal (Apple Silicon)',
        'Python 3.9+ with transformers (optional)'
      ]
    }
  ]
}

/**
 * Get recommended OCR provider for the current platform
 * @returns Recommended engine name
 */
export function getRecommendedProvider(): OcrEngine {
  const platform = process.platform

  // macOS: Live Text is fast, accurate, and free
  if (platform === 'darwin') {
    return 'livetext'
  }

  // Linux/Windows: Tesseract is the best free option
  return 'tesseract'
}

/**
 * Check if a specific provider is available on the current system
 * @param engine - Engine to check
 * @returns True if the provider is available
 */
export async function isProviderAvailable(engine: OcrEngine): Promise<boolean> {
  try {
    const provider = await createOcrProvider({ engine })
    const available = !provider.isAvailable || (await provider.isAvailable())
    if (provider.cleanup) {
      await provider.cleanup()
    }
    return available
  } catch {
    return false
  }
}

/**
 * Get the best available OCR provider for the current system
 * @param preferredEngine - Preferred engine (will try this first)
 * @returns Engine name and provider instance
 */
export async function getBestAvailableProvider(
  preferredEngine?: OcrEngine
): Promise<{ engine: OcrEngine; provider: OcrProvider }> {
  // Try preferred engine first
  if (preferredEngine) {
    try {
      const provider = await createOcrProvider({ engine: preferredEngine })
      return { engine: preferredEngine, provider }
    } catch {
      // Fall through to try other providers
    }
  }

  // Try recommended provider for this platform
  const recommended = getRecommendedProvider()
  try {
    const provider = await createOcrProvider({ engine: recommended })
    return { engine: recommended, provider }
  } catch {
    // Fall through to try remaining providers
  }

  // Try all providers in order of preference
  const fallbackOrder: OcrEngine[] = [
    'tesseract',
    'livetext',
    'openai',
    'local-vision'
  ]
  for (const engine of fallbackOrder) {
    if (engine === preferredEngine || engine === recommended) {
      continue // Already tried
    }
    try {
      const provider = await createOcrProvider({ engine })
      return { engine, provider }
    } catch {
      // Try next provider
    }
  }

  throw new Error(
    'No OCR provider available. Please install Tesseract or configure OpenAI API key.'
  )
}

// Re-export types for convenience
export type {
  OcrProvider,
  OcrProviderConfig,
  OcrProviderInfo,
  OcrOptions
} from './types.js'
export {
  OcrError,
  OcrProcessingError,
  ProviderNotAvailableError
} from './types.js'
