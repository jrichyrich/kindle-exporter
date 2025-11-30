/**
 * Test script for Searchable PDF with Tesseract hOCR (Positioned Text)
 * Creates a PDF with visible screenshots and invisible OCR text layer
 * positioned exactly where text appears in the image
 */

import { TesseractProvider } from './src/ocr/tesseract.js'
import { SearchablePdfExporter } from './src/exporters/searchablePdf.js'
import { readdir } from 'fs/promises'
import { join } from 'path'
import type { ContentChunk, BookMetadata } from './src/types.js'

async function main() {
  console.log('='.repeat(70))
  console.log('Searchable PDF Test with Tesseract hOCR (Positioned Text)')
  console.log('='.repeat(70))
  console.log()

  // Test configuration
  const screenshotsDir = 'exports/Inner_Excellence_20pg_Test/screenshots'
  const outputDir = 'exports/Inner_Excellence_20pg_Test'
  const numPages = 3

  try {
    // Initialize Tesseract provider
    console.log('📦 Initializing Tesseract OCR with hOCR support...')
    const provider = new TesseractProvider({
      engine: 'tesseract',
      lang: 'eng'
    })

    const isAvailable = await provider.isAvailable()
    if (!isAvailable) {
      console.error(
        '❌ Tesseract not available. Install with: brew install tesseract'
      )
      process.exit(1)
    }
    console.log('✅ Tesseract available\n')

    // Get screenshot files
    console.log(`📸 Looking for screenshots in: ${screenshotsDir}`)
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

    // Process each page with OCR (hOCR format with word positions)
    const content: ContentChunk[] = []
    const startTime = Date.now()
    let totalWords = 0

    for (let i = 0; i < pngFiles.length; i++) {
      const file = pngFiles[i]
      const imagePath = join(screenshotsDir, file)

      console.log(`🔍 Page ${i + 1}/${pngFiles.length}: ${file}`)
      const pageStart = Date.now()

      // Run OCR with position data
      const { text, wordPositions } = await provider.ocrWithPositions(imagePath)
      const duration = ((Date.now() - pageStart) / 1000).toFixed(1)

      totalWords += wordPositions.length

      console.log(
        `   ✅ Extracted ${text.length} chars, ${wordPositions.length} words in ${duration}s\n`
      )

      // Add to content chunks with word positions
      content.push({
        index: i,
        page: i + 1,
        text: text,
        screenshot: imagePath,
        wordPositions: wordPositions
      })
    }

    const totalOcrTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ OCR completed in ${totalOcrTime}s\n`)

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

    // Create searchable PDF with positioned text
    console.log('📄 Creating searchable PDF with positioned text...')
    const exporter = new SearchablePdfExporter()

    const pdfStart = Date.now()
    const result = await exporter.export(content, metadata, {
      bookTitle: 'Inner_Excellence_Tesseract_Positioned',
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
    console.log(`Total words positioned: ${totalWords}`)
    console.log(
      `OCR time: ${totalOcrTime}s (avg ${(parseFloat(totalOcrTime) / numPages).toFixed(1)}s per page)`
    )
    console.log(`PDF generation: ${pdfTime}s`)
    console.log(`Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
    console.log()

    console.log('🎉 Test completed successfully!')
    console.log()
    console.log('✨ BENEFITS OF POSITIONED TEXT:')
    console.log('1. Open the PDF in Preview or Acrobat')
    console.log('2. Search for text with Cmd+F')
    console.log('3. Select text with your mouse')
    console.log('4. Text highlighting shows EXACTLY where words appear!')
    console.log('5. No more misaligned text selection')
    console.log()
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

main()
