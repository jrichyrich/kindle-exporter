/**
 * Test script for comparing screenshots with OCR output
 * Processes 3 pages and saves OCR results for manual comparison
 */

import { LocalVisionProvider } from './src/ocr/localVision.js'
import { readdirSync, writeFileSync } from 'fs'
import { join, basename } from 'path'

async function main() {
  const screenshotDir =
    process.argv[2] || 'exports/Inner_Excellence_20pg_Test/screenshots'
  const numPages = parseInt(process.argv[3] || '3', 10)

  console.log('🔍 Local Vision OCR - Comparison Test')
  console.log('='.repeat(70))
  console.log(`Screenshot directory: ${screenshotDir}`)
  console.log(`Processing ${numPages} pages`)
  console.log()

  // Get screenshot files
  const files = readdirSync(screenshotDir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .slice(0, numPages)
    .map((f) => join(screenshotDir, f))

  if (files.length === 0) {
    console.error('❌ No screenshots found!')
    process.exit(1)
  }

  console.log(`Found ${files.length} screenshots:`)
  files.forEach((f) => console.log(`  - ${basename(f)}`))
  console.log()

  // Initialize provider
  console.log('Initializing Local Vision provider...')
  const provider = new LocalVisionProvider({
    engine: 'local-vision',
    modelName: 'qwen2-vl-7b'
  })

  const available = await provider.isAvailable()
  if (!available) {
    console.error('❌ Provider not available')
    console.error('Make sure Ollama is running and qwen2.5vl:7b is pulled')
    process.exit(1)
  }

  await provider.initialize()
  console.log('✅ Initialized')
  console.log()

  // Create output directory
  const outputDir = join(screenshotDir, 'ocr_comparison')
  try {
    const { mkdirSync } = await import('fs')
    mkdirSync(outputDir, { recursive: true })
  } catch {
    // Directory might already exist
  }

  console.log(`Output directory: ${outputDir}`)
  console.log()

  // Process each page
  console.log('Processing pages...')
  console.log('='.repeat(70))

  const results: Array<{
    screenshot: string
    ocrFile: string
    text: string
    chars: number
    words: number
    duration: number
  }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const pageNum = i + 1
    const imageName = basename(file)
    const ocrFileName = imageName.replace('.png', '_ocr.txt')
    const ocrPath = join(outputDir, ocrFileName)

    console.log(`\n[Page ${pageNum}/${files.length}] ${imageName}`)
    console.log('-'.repeat(70))

    const startTime = Date.now()
    const text = await provider.ocr(file)
    const duration = Date.now() - startTime

    const chars = text.length
    const words = text.split(/\s+/).length

    // Save OCR output
    writeFileSync(ocrPath, text, 'utf-8')

    console.log(`✅ OCR completed in ${(duration / 1000).toFixed(1)}s`)
    console.log(`   Characters: ${chars}`)
    console.log(`   Words: ${words}`)
    console.log(`   Output saved: ${ocrFileName}`)

    results.push({
      screenshot: imageName,
      ocrFile: ocrFileName,
      text,
      chars,
      words,
      duration
    })
  }

  console.log()
  console.log('='.repeat(70))

  // Create combined output file
  const combinedPath = join(outputDir, 'combined_output.txt')
  let combinedContent = `Local Vision OCR Comparison Test
Generated: ${new Date().toISOString()}
Model: Qwen2.5-VL 7B
Pages processed: ${results.length}

${'='.repeat(70)}

`

  results.forEach((result, i) => {
    combinedContent += `PAGE ${i + 1}: ${result.screenshot}
Duration: ${(result.duration / 1000).toFixed(1)}s | Characters: ${result.chars} | Words: ${result.words}
${'='.repeat(70)}

${result.text}

${'='.repeat(70)}

`
  })

  writeFileSync(combinedPath, combinedContent, 'utf-8')

  // Display final stats
  const stats = provider.getStats()
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  const totalChars = results.reduce((sum, r) => sum + r.chars, 0)
  const totalWords = results.reduce((sum, r) => sum + r.words, 0)

  console.log()
  console.log('Summary:')
  console.log('='.repeat(70))
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log(
    `Average per page: ${(totalDuration / 1000 / results.length).toFixed(1)}s`
  )
  console.log(`Total characters: ${totalChars.toLocaleString()}`)
  console.log(`Total words: ${totalWords.toLocaleString()}`)
  console.log(`Average chars/page: ${Math.round(totalChars / results.length)}`)
  console.log(`Average words/page: ${Math.round(totalWords / results.length)}`)
  console.log()
  console.log('OCR Stats:')
  console.log(
    `  Successful: ${stats.successfulRequests}/${stats.totalRequests}`
  )
  console.log(`  Failed: ${stats.failedRequests}`)
  console.log(`  Retries: ${stats.totalRetries}`)
  console.log()

  // Display comparison instructions
  console.log('='.repeat(70))
  console.log('📊 HOW TO COMPARE:')
  console.log('='.repeat(70))
  console.log()
  console.log('1. Screenshot location:')
  console.log(`   ${screenshotDir}/`)
  console.log()
  console.log('2. OCR output location:')
  console.log(`   ${outputDir}/`)
  console.log()
  console.log('3. Files to compare:')
  results.forEach((result, i) => {
    console.log(`   Page ${i + 1}:`)
    console.log(`   📸 Screenshot: ${screenshotDir}/${result.screenshot}`)
    console.log(`   📝 OCR Text:   ${outputDir}/${result.ocrFile}`)
    console.log()
  })
  console.log('4. Combined output:')
  console.log(`   📄 ${outputDir}/combined_output.txt`)
  console.log()
  console.log(
    'Open the screenshot in an image viewer, then open the corresponding'
  )
  console.log('OCR text file side-by-side to compare accuracy!')
  console.log()

  // Cleanup
  await provider.cleanup()
  console.log('✅ Comparison test complete!')
}

main().catch(console.error)
