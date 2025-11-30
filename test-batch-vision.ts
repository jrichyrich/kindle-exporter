/**
 * Test script for batch OCR with Local Vision provider
 * Tests retry logic, circuit breaker, and stats tracking with multiple images
 */

import { LocalVisionProvider } from './src/ocr/localVision.js'
import { readdirSync } from 'fs'
import { join } from 'path'

async function main() {
  const screenshotDir =
    process.argv[2] || 'exports/Inner_Excellence_20pg_Test/screenshots'
  const maxPages = parseInt(process.argv[3] || '10', 10)

  console.log('🔍 Testing Local Vision OCR - Batch Processing')
  console.log('='.repeat(60))
  console.log(`Screenshot directory: ${screenshotDir}`)
  console.log(`Max pages: ${maxPages}`)
  console.log()

  // Get screenshot files
  const files = readdirSync(screenshotDir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .slice(0, maxPages)
    .map((f) => join(screenshotDir, f))

  console.log(`Found ${files.length} screenshots`)
  console.log()

  // Initialize provider
  const provider = new LocalVisionProvider({
    engine: 'local-vision',
    modelName: 'qwen2-vl-7b'
  })

  // Check availability
  console.log('Checking if Ollama and model are available...')
  const available = await provider.isAvailable()
  if (!available) {
    console.error('❌ Provider not available')
    process.exit(1)
  }
  console.log('✅ Available')
  console.log()

  // Initialize
  console.log('Initializing provider...')
  await provider.initialize()
  console.log('✅ Initialized')
  console.log()

  // Process images
  console.log('Processing images...')
  console.log('-'.repeat(60))

  const startTime = Date.now()
  const results: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const pageNum = i + 1

    console.log(
      `[${pageNum}/${files.length}] Processing ${file.split('/').pop()}...`
    )

    try {
      const text = await provider.ocr(file)
      results.push(text)

      const stats = provider.getStats()
      const avgDuration = (stats.averageDuration / 1000).toFixed(1)
      console.log(`  ✅ Success (${text.length} chars, avg: ${avgDuration}s)`)
    } catch (error) {
      console.log(
        `  ❌ Failed: ${error instanceof Error ? error.message : String(error)}`
      )
      results.push('[OCR FAILED]')
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('-'.repeat(60))
  console.log()

  // Display final stats
  const stats = provider.getStats()
  const circuitStatus = provider.getCircuitBreakerStatus()

  console.log('Final Statistics:')
  console.log('='.repeat(60))
  console.log(`Total duration: ${totalDuration}s`)
  console.log(`Pages processed: ${files.length}`)
  console.log(
    `Average per page: ${(parseFloat(totalDuration) / files.length).toFixed(1)}s`
  )
  console.log()
  console.log('OCR Stats:')
  console.log(`  Total requests: ${stats.totalRequests}`)
  console.log(`  Successful: ${stats.successfulRequests}`)
  console.log(`  Failed: ${stats.failedRequests}`)
  console.log(`  Retried: ${stats.retriedRequests}`)
  console.log(`  Total retries: ${stats.totalRetries}`)
  console.log(
    `  Average duration: ${(stats.averageDuration / 1000).toFixed(1)}s`
  )
  console.log()
  console.log('Circuit Breaker:')
  console.log(`  State: ${circuitStatus.state}`)
  console.log(`  Failure count: ${circuitStatus.failureCount}`)
  console.log(`  Is open: ${circuitStatus.isOpen}`)
  console.log()

  // Display word counts
  const totalChars = results.reduce((sum, text) => sum + text.length, 0)
  const totalWords = results.reduce(
    (sum, text) => sum + text.split(/\s+/).length,
    0
  )
  console.log('Text Extraction:')
  console.log(`  Total characters: ${totalChars.toLocaleString()}`)
  console.log(`  Total words: ${totalWords.toLocaleString()}`)
  console.log(
    `  Average chars per page: ${Math.round(totalChars / files.length)}`
  )
  console.log(
    `  Average words per page: ${Math.round(totalWords / files.length)}`
  )
  console.log()

  // Cleanup
  await provider.cleanup()
  console.log('✅ Batch test complete!')
}

main().catch(console.error)
