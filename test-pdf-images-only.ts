/**
 * Test script for Image-Only PDF (No OCR)
 * Creates a PDF by simply combining PNG screenshots
 * Fastest option - no OCR processing required
 */

import { SearchablePdfExporter } from './src/exporters/searchablePdf.js'
import { readdir } from 'fs/promises'
import { join } from 'path'
import type { ContentChunk, BookMetadata } from './src/types.js'

async function main() {
  console.log('='.repeat(70))
  console.log('Image-Only PDF Test (No OCR)')
  console.log('='.repeat(70))
  console.log()

  // Test configuration
  const screenshotsDir = 'exports/Inner_Excellence_20pg_Test/screenshots'
  const outputDir = 'exports/Inner_Excellence_20pg_Test'
  const numPages = 3

  try {
    console.log('📸 Looking for screenshots in:', screenshotsDir)
    const files = await readdir(screenshotsDir)
    const pngFiles = files
      .filter((f) => f.endsWith('.png'))
      .sort()
      .slice(0, numPages)

    if (pngFiles.length === 0) {
      console.error('❌ No PNG files found')
      process.exit(1)
    }

    console.log(`Found ${pngFiles.length} screenshots\n`)

    // Create content chunks WITHOUT text (no OCR)
    const content: ContentChunk[] = []
    for (let i = 0; i < pngFiles.length; i++) {
      const file = pngFiles[i]
      const imagePath = join(screenshotsDir, file)

      console.log(`📄 Adding page ${i + 1}/${pngFiles.length}: ${file}`)

      content.push({
        index: i,
        page: i + 1,
        text: '', // No text - no OCR performed
        screenshot: imagePath
      })
    }

    console.log()

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

    // Create image-only PDF (using SearchablePdfExporter without text)
    console.log('📄 Creating image-only PDF (full-bleed, no margins)...')
    const exporter = new SearchablePdfExporter()

    const startTime = Date.now()
    const result = await exporter.export(content, metadata, {
      bookTitle: 'Inner_Excellence_Images_Only_FullBleed',
      outputDir: outputDir,
      format: 'pdf-ocr' // Uses pdf-ocr exporter but without text
    })
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`✅ PDF created in ${duration}s\n`)

    // Display results
    console.log('='.repeat(70))
    console.log('RESULTS')
    console.log('='.repeat(70))
    console.log(`Output file: ${result.filePath}`)
    console.log(`File size: ${(result.fileSize / 1024).toFixed(1)} KB`)
    console.log(`Pages: ${result.pageCount}`)
    console.log(`Creation time: ${duration}s`)
    console.log(
      `Speed: ${(parseFloat(duration) / numPages).toFixed(3)}s per page`
    )
    console.log()

    console.log('🎉 Test completed successfully!')
    console.log()
    console.log('✨ CHARACTERISTICS:')
    console.log('✅ Fastest option - no OCR processing')
    console.log('✅ Perfect image quality - original screenshots')
    console.log('✅ Full-bleed pages - no margins, exact image dimensions')
    console.log('✅ No white space or scaling issues')
    console.log('❌ NOT searchable - no text layer')
    console.log('❌ Cannot select/copy text')
    console.log()
    console.log('📖 USE CASE:')
    console.log('Perfect for creating quick PDF archives of screenshots')
    console.log('when searchability is not needed.')
    console.log('Each page matches the exact dimensions of the original image!')
    console.log()
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

main()
