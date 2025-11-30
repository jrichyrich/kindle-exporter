/**
 * Test script for Searchable PDF Exporter with Local Vision Model
 * Creates a PDF with visible screenshots and invisible OCR text layer
 */

import { LocalVisionProvider } from './src/ocr/localVision.js'
import { SearchablePdfExporter } from './src/exporters/searchablePdf.js'
import { readdir } from 'fs/promises'
import { join } from 'path'
import type { ContentChunk, BookMetadata } from './src/types.js'

async function main() {
  console.log('='.repeat(70))
  console.log('Searchable PDF Test with Local Vision Model')
  console.log('='.repeat(70))
  console.log()

  // Test configuration
  const screenshotsDir = 'exports/Inner_Excellence_20pg_Test/screenshots'
  const outputDir = 'exports/Inner_Excellence_20pg_Test'
  const numPages = 3

  try {
    // Initialize local vision provider
    console.log('📦 Initializing local vision model (Qwen2.5-VL 7B)...')
    const provider = new LocalVisionProvider({
      engine: 'local-vision',
      modelName: 'qwen2-vl-7b'
    })

    const isAvailable = await provider.isAvailable()
    if (!isAvailable) {
      console.error(
        '❌ Local vision model not available. Please run: ollama pull qwen2.5vl:7b'
      )
      process.exit(1)
    }

    // Get screenshot files
    console.log(`\n📸 Looking for screenshots in: ${screenshotsDir}`)
    const files = await readdir(screenshotsDir)
    const pngFiles = files
      .filter((f) => f.endsWith('.png'))
      .sort()
      .slice(0, numPages)

    if (pngFiles.length === 0) {
      console.error('❌ No PNG files found in screenshots directory')
      process.exit(1)
    }

    console.log(`Found ${pngFiles.length} screenshots to process\n`)

    // Process each page with OCR
    const content: ContentChunk[] = []
    const startTime = Date.now()

    for (let i = 0; i < pngFiles.length; i++) {
      const file = pngFiles[i]
      const imagePath = join(screenshotsDir, file)

      console.log(`🔍 Page ${i + 1}/${pngFiles.length}: ${file}`)
      const pageStart = Date.now()

      // Run OCR
      const text = await provider.ocr(imagePath)
      const duration = ((Date.now() - pageStart) / 1000).toFixed(1)

      console.log(`   ✅ Extracted ${text.length} characters in ${duration}s\n`)

      // Add to content chunks
      content.push({
        index: i,
        page: i + 1,
        text: text,
        screenshot: imagePath
      })
    }

    const totalOcrTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ OCR completed in ${totalOcrTime}s\n`)

    // Create mock metadata
    const metadata: BookMetadata = {
      meta: {
        ACR: '',
        asin: 'B0DYJFQQPX',
        authorList: ['Jim Murphy'],
        bookSize: '',
        bookType: 'EBOK',
        cover: '',
        language: 'en',
        positions: { cover: 0, srl: 0, toc: 0 },
        publisher: '',
        refEmId: '',
        releaseDate: '',
        sample: false,
        title: 'Inner Excellence',
        version: '',
        startPosition: 0,
        endPosition: 0
      },
      info: {} as any,
      nav: {} as any,
      toc: [],
      pages: [],
      locationMap: { locations: [], navigationUnit: [] }
    }

    // Create searchable PDF
    console.log('📄 Creating searchable PDF...')
    const exporter = new SearchablePdfExporter()

    const pdfStart = Date.now()
    const result = await exporter.export(content, metadata, {
      bookTitle: 'Inner_Excellence_Searchable_Test',
      outputDir: outputDir,
      format: 'pdf-ocr'
    })
    const pdfTime = ((Date.now() - pdfStart) / 1000).toFixed(1)

    console.log(`✅ PDF created in ${pdfTime}s\n`)

    // Display results
    console.log('='.repeat(70))
    console.log('RESULTS')
    console.log('='.repeat(70))
    console.log(`Output file: ${result.filePath}`)
    console.log(`File size: ${(result.fileSize / 1024).toFixed(1)} KB`)
    console.log(`Pages: ${result.pageCount}`)
    console.log(`Total OCR time: ${totalOcrTime}s`)
    console.log(`PDF generation time: ${pdfTime}s`)
    console.log(`Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
    console.log()

    // Display OCR stats
    const stats = provider.getStats()
    console.log('OCR Statistics:')
    console.log(`  Total requests: ${stats.totalRequests}`)
    console.log(`  Successful: ${stats.successfulRequests}`)
    console.log(`  Failed: ${stats.failedRequests}`)
    console.log(
      `  Success rate: ${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`
    )
    console.log(
      `  Average duration: ${(stats.averageDuration / 1000).toFixed(1)}s`
    )
    console.log()

    console.log('🎉 Test completed successfully!')
    console.log()
    console.log('To test the searchable PDF:')
    console.log('1. Open the PDF in Preview or Acrobat')
    console.log('2. Press Cmd+F to search for text')
    console.log('3. Try copying text with your mouse')
    console.log('4. Verify the screenshots are visible')
    console.log()
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

main()
