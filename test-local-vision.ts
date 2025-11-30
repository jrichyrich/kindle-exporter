/**
 * Test script for Local Vision OCR provider
 * Usage: tsx test-local-vision.ts <image-path>
 */

import { LocalVisionProvider } from './src/ocr/localVision.js'

async function main() {
  const imagePath =
    process.argv[2] ||
    'exports/Inner_Excellence_20pg_Test/screenshots/page_0001.png'

  console.log('🔍 Testing Local Vision OCR Provider')
  console.log('='.repeat(50))
  console.log(`Image: ${imagePath}`)
  console.log()

  // Initialize provider
  const provider = new LocalVisionProvider({
    engine: 'local-vision',
    modelName: 'qwen2-vl-7b'
  })

  // Check availability
  console.log('Checking if Ollama and model are available...')
  const available = await provider.isAvailable()
  console.log(`Available: ${available}`)
  console.log()

  if (!available) {
    console.error('❌ Provider not available. Make sure:')
    console.error('  1. Ollama is running: ollama serve')
    console.error('  2. Model is pulled: ollama pull qwen2.5vl:7b')
    process.exit(1)
  }

  // Initialize
  console.log('Initializing provider...')
  await provider.initialize()
  console.log('✅ Initialized')
  console.log()

  // Run OCR
  console.log('Running OCR...')
  const startTime = Date.now()
  const text = await provider.ocr(imagePath)
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log('✅ OCR completed')
  console.log()
  console.log('Results:')
  console.log('='.repeat(50))
  console.log(`Duration: ${duration}s`)
  console.log(`Text length: ${text.length} characters`)
  console.log(`Word count: ${text.split(/\s+/).length} words`)
  console.log()

  // Display stats
  const stats = provider.getStats()
  const circuitStatus = provider.getCircuitBreakerStatus()

  console.log('Statistics:')
  console.log('-'.repeat(50))
  console.log(`Total requests: ${stats.totalRequests}`)
  console.log(`Successful: ${stats.successfulRequests}`)
  console.log(`Failed: ${stats.failedRequests}`)
  console.log(`Retried: ${stats.retriedRequests}`)
  console.log(`Total retries: ${stats.totalRetries}`)
  console.log(`Average duration: ${stats.averageDuration.toFixed(0)}ms`)
  console.log()
  console.log('Circuit Breaker:')
  console.log(`State: ${circuitStatus.state}`)
  console.log(`Failure count: ${circuitStatus.failureCount}`)
  console.log(`Is open: ${circuitStatus.isOpen}`)
  console.log()

  console.log('Extracted text:')
  console.log('-'.repeat(50))
  console.log(text)
  console.log('-'.repeat(50))

  // Cleanup
  await provider.cleanup()
  console.log()
  console.log('✅ Test complete!')
}

main().catch(console.error)
