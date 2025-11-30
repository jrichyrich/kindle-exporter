# Kindle Exporter

> Export any Kindle book you own as text, PDF, EPUB, Markdown, or as a custom AI-narrated audiobook. 🚀

**Status**: 🔍 Beta - Ready for Public Testing!

[![Version](https://img.shields.io/badge/version-0.1.0--beta-blue.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](tsconfig.json)

## Overview

Kindle Exporter is a comprehensive tool that exports your Kindle books using browser automation and OCR. It combines the best features from multiple Kindle export projects to create the most reliable and feature-rich Kindle book exporter available.

### Key Features

- 🎯 **Multiple Export Formats**: Text, PDF (with TOC), Searchable PDF, EPUB, Markdown
- 🔄 **Resume Capability**: Pick up where you left off if interrupted
- 🤖 **Flexible OCR Options**:
  - **Local**: Live Text (macOS), Tesseract (cross-platform)
  - **Cloud**: OpenAI Vision Models (GPT-4 Vision)
  - **Local Vision Models**: Qwen2-VL, LLaMA Vision, Pixtral (FREE, high accuracy!)
- 📚 **Rich Metadata**: Full table of contents, chapter boundaries, Kindle sync positions
- 🎨 **Smart Screenshot Capture**: Canvas clipping to exclude UI elements
- 💻 **Clean CLI**: Simple command-line interface with progress indicators
- 🌐 **Browser Automation**: Uses Playwright for reliable Kindle Cloud Reader access
- ✨ **Production Ready**: Tested with real books, all core features working

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/kindle-exporter.git
cd kindle-exporter

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Prerequisites

1. **Node.js**: Version 20 or higher
2. **Chrome Profile**: A Chrome profile with active Amazon/Kindle login
3. **OCR Provider**: At least one of the following:
   - **macOS Live Text** (built-in, recommended for macOS)
   - **Tesseract** (cross-platform): `brew install tesseract` or `apt-get install tesseract-ocr`
   - **OpenAI API Key** (cloud-based, requires API key)

### Basic Usage

```bash
# Export a book as text (simplest example)
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "My Book" \
  --format text \
  --ocr livetext

# Export as PDF with table of contents
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "My Book" \
  --format pdf \
  --ocr livetext

# Export with multiple formats
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "My Book" \
  --format text,pdf,markdown \
  --ocr livetext

# Run in headful mode to see what's happening
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "My Book" \
  --format text \
  --ocr livetext \
  --headful
```

## Finding Your Book's ASIN

The ASIN is Amazon's unique book identifier. To find it:

1. Go to [Kindle Cloud Reader](https://read.amazon.com/kindle-library)
2. Open the book you want to export
3. Look at the URL: `https://read.amazon.com/?asin=B0DYJFQQPX`
4. The ASIN is the alphanumeric code after `asin=`

## Usage Guide

### CLI Options

#### Required Options

- `--asin <asin>` - Amazon ASIN of the book to export
- `--book-title <title>` - Title of the book (used for folder naming)
- `--format <formats>` - Export format(s): `text`, `pdf`, `markdown`, `epub`, `searchable-pdf`
  - Multiple formats: `--format text,pdf,markdown`
- `--ocr <provider>` - OCR provider: `livetext`, `tesseract`, `openai`, `qwen`, `llama`, `pixtral`

#### Optional Options

- `--output-dir <path>` - Output directory (default: `./exports`)
- `--max-pages <number>` - Maximum pages to capture (for testing)
- `--start-page <number>` - Starting page number (default: 1)
- `--headful` - Show browser window (useful for debugging)
- `--profile-path <path>` - Chrome profile path with Kindle login
- `--delay-min <ms>` - Minimum delay between pages (default: 2000ms)
- `--delay-max <ms>` - Maximum delay between pages (default: 4000ms)

### OCR Providers

#### 1. Live Text (macOS only) - **Recommended for macOS**

Built into macOS, no setup required. Fast and accurate.

```bash
node dist/cli.js --asin <asin> --book-title "Book" --format text --ocr livetext
```

#### 2. Tesseract (Cross-platform)

Free and open source. Requires installation.

```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Usage
node dist/cli.js --asin <asin> --book-title "Book" --format text --ocr tesseract
```

#### 3. OpenAI Vision (Cloud)

High accuracy, requires API key and costs money per page.

```bash
# Set your API key
export OPENAI_API_KEY="sk-..."

# Usage
node dist/cli.js --asin <asin> --book-title "Book" --format text --ocr openai
```

#### 4. Local Vision Models (Advanced)

FREE alternatives to OpenAI. Requires local model setup with Ollama or similar.

```bash
# Qwen2-VL (recommended)
node dist/cli.js --asin <asin> --book-title "Book" --format text --ocr qwen

# LLaMA Vision
node dist/cli.js --asin <asin> --book-title "Book" --format text --ocr llama

# Pixtral
node dist/cli.js --asin <asin> --book-title "Book" --format text --ocr pixtral
```

### Export Formats

#### Text (`.txt`)
Simple plain text format with chapter headers.

```bash
--format text
```

#### PDF with Table of Contents
PDF with clickable bookmarks for each chapter.

```bash
--format pdf
```

#### Searchable PDF
PDF with embedded OCR text layer for searching.

```bash
--format searchable-pdf
```

#### Markdown (`.md`)
Markdown with YAML front matter containing metadata.

```bash
--format markdown
```

#### EPUB
EPUB format via Calibre (requires `ebook-convert` installed).

```bash
--format epub
```

**Multiple formats:**
```bash
--format text,pdf,markdown
```

## How It Works

1. **Browser Automation**: Launches Chrome with Playwright and navigates to Kindle Cloud Reader
2. **Metadata Extraction**: Captures book metadata, table of contents, and chapter information
3. **Screenshot Capture**: Takes screenshots of each page, clipping out UI elements
4. **OCR Processing**: Runs OCR on screenshots using your chosen provider
5. **Export**: Generates your chosen format(s) with proper formatting and metadata

## Examples

### Export a novel as text and PDF

```bash
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "Inner Excellence" \
  --format text,pdf \
  --ocr livetext
```

### Export just the first 10 pages for testing

```bash
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "Inner Excellence" \
  --format text \
  --ocr livetext \
  --max-pages 10 \
  --headful
```

### Resume a failed export

```bash
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "Inner Excellence" \
  --format text \
  --ocr livetext \
  --start-page 42
```

### Use Tesseract on Linux

```bash
node dist/cli.js \
  --asin B0DYJFQQPX \
  --book-title "My Book" \
  --format text,markdown \
  --ocr tesseract
```

## Configuration

### Chrome Profile Path

By default, the tool looks for Chrome profiles in standard locations:

- **macOS**: `~/Library/Application Support/Google/Chrome/Default`
- **Linux**: `~/.config/google-chrome/default`

To use a different profile:

```bash
node dist/cli.js \
  --asin <asin> \
  --book-title "Book" \
  --format text \
  --ocr livetext \
  --profile-path "/path/to/your/chrome/profile"
```

### Output Directory

Exports are saved to `./exports` by default. Each book gets its own folder:

```
exports/
└── My_Book_Title/
    ├── screenshots/
    │   ├── page_0001.png
    │   ├── page_0002.png
    │   └── ...
    ├── My Book Title.txt
    ├── My Book Title.pdf
    └── metadata.json
```

To use a different directory:

```bash
node dist/cli.js \
  --asin <asin> \
  --book-title "Book" \
  --format text \
  --ocr livetext \
  --output-dir ~/Documents/kindle-exports
```

## Troubleshooting

### "Browser not logged in" or "Can't access book"

**Solution**: Make sure your Chrome profile is logged into Amazon/Kindle:

1. Open Chrome with your profile
2. Go to https://read.amazon.com
3. Log in to your Amazon account
4. Verify you can open the book manually
5. Try the export again

### "OCR failed" or poor OCR quality

**Solutions**:
- Try a different OCR provider (LiveText is most accurate on macOS)
- Run in `--headful` mode to see what's being captured
- Check that screenshots in `exports/*/screenshots/` look correct
- For Tesseract: install language packs (`brew install tesseract-lang`)

### "Page navigation failed"

**Solutions**:
- Increase delays: `--delay-min 3000 --delay-max 5000`
- Run in `--headful` mode to see what's happening
- Check your internet connection
- Verify the book opens correctly in Kindle Cloud Reader manually

### Export takes too long

**Solutions**:
- Use LiveText (fastest on macOS) or Tesseract (fast on Linux)
- Avoid OpenAI for long books (costs add up)
- Test with `--max-pages 5` first to verify everything works

### Resume from failure

If an export fails partway through, resume from where it stopped:

```bash
# Check the last screenshot number
ls exports/My_Book/screenshots/ | tail -1
# If last screenshot is page_0042.png, resume from 43

node dist/cli.js \
  --asin <asin> \
  --book-title "My Book" \
  --format text \
  --ocr livetext \
  --start-page 43
```

## Development Roadmap

### ✅ Completed Phases

- ✅ **Phase 1**: Foundation - TypeScript setup, dependencies, build system
- ✅ **Phase 2-3**: Core OCR - All 4 OCR providers integrated
- ✅ **Phase 4**: Metadata - Amazon metadata extraction, TOC parsing
- ✅ **Phase 5**: Export Formats - Text, PDF, Searchable PDF, Markdown, EPUB
- ✅ **Phase 6-7**: Automation - Browser session, screenshot capture, navigation
- ✅ **Phase 8**: Integration - End-to-end orchestrator, CLI integration
- ✅ **Phase 9**: Testing - Real-world testing, 7+ bug fixes, OCR optimization

### 🔄 Current Phase

- 🔄 **Phase 10**: Documentation & Polish (this phase!)

### 📋 Future Enhancements

- 🎙️ **Audiobook Export** (TTS with voice selection)
- 📦 **Batch Processing** (export multiple books)
- 🔧 **Repair Tool** (fix failed OCR on specific pages)
- 🎨 **Interactive CLI** (prompts and menus)
- 🐳 **Docker Support** (containerized exports)
- 📊 **Structured Logging** (JSON logs)

## Architecture

```
kindle-exporter/
├── src/
│   ├── automation/          # Browser automation, page navigation
│   │   ├── browser.ts       # Playwright session management
│   │   ├── capture.ts       # Screenshot capture with canvas clipping
│   │   ├── metadata.ts      # Metadata extraction from Kindle Cloud Reader
│   │   └── state.ts         # Run state management for resume
│   ├── ocr/                 # Pluggable OCR providers
│   │   ├── factory.ts       # OCR provider factory
│   │   ├── livetext.ts      # macOS Live Text (via sips)
│   │   ├── tesseract.ts     # Tesseract OCR
│   │   ├── openai.ts        # OpenAI Vision models
│   │   └── localVision.ts   # Local vision models (Qwen, LLaMA, Pixtral)
│   ├── exporters/           # Format exporters
│   │   ├── factory.ts       # Exporter factory
│   │   ├── text.ts          # Plain text
│   │   ├── pdf.ts           # PDF with TOC
│   │   ├── searchablePdf.ts # Searchable PDF
│   │   ├── markdown.ts      # Markdown with front matter
│   │   └── epub.ts          # EPUB via Calibre
│   ├── metadata/            # Metadata parsing
│   │   ├── parser.ts        # JSONP and TOC parsing
│   │   └── utils.ts         # Location/position utilities
│   ├── orchestrator.ts      # Main workflow coordinator
│   ├── cli.ts               # CLI entry point
│   └── types.ts             # TypeScript type definitions
├── docs/                    # Documentation
├── dist/                    # Built JavaScript
└── exports/                 # Default export directory
```

## Technology Stack

- **Language**: TypeScript/Node.js (>= 20)
- **Package Manager**: pnpm
- **Browser Automation**: Playwright
- **OCR Engines**:
  - macOS Live Text (via `sips`)
  - Tesseract (via `tesseract` CLI)
  - OpenAI Vision API
  - Local vision models (Ollama)
- **PDF Generation**: PDFKit
- **Image Processing**: Sharp
- **Testing**: Vitest (planned)

## Why This Project?

Kindle uses proprietary formats that make it difficult to:
- Access your purchased content offline in flexible formats
- Create searchable archives of your library
- Generate custom formats for different reading devices
- Build AI-powered reading tools and annotations

This project provides a **legal, local, automation-based solution** that respects DRM while enabling personal use of your own content through Kindle Cloud Reader.

## Disclaimer

**This project is intended purely for personal and educational use only**. It is not endorsed or supported by Amazon / Kindle. By using this project, you agree to:

- ✅ Only export books you personally own and have purchased
- ✅ Not share exported content publicly or commercially
- ✅ Respect copyright laws and support authors by purchasing books
- ✅ Use automation responsibly with human-like pacing (built-in delays)
- ❌ Not use this tool to circumvent DRM or distribute content
- ❌ Not abuse Amazon's services or violate their Terms of Service

This tool is designed for personal backup and format conversion of legally owned content only.

## Contributing

This project is in alpha. Contributions will be welcome after v1.0.0 release.

For now, please:
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features via GitHub Discussions
- ⭐ Star the repo if you find it useful!

## License

MIT © Jason Richardson

## Acknowledgments

This project builds upon and merges ideas from:
- [kindle-ai-export](https://github.com/transitive-bullshit/kindle-ai-export) by Travis Fischer
- [kindle_exporter_tool](https://github.com/jrichyrich/kindle_exporter_tool) (private repo)

Special thanks to:
- The Playwright team for excellent browser automation
- The Tesseract OCR project
- OpenAI for Vision API
- The open source community for the libraries that make this possible

---

**Current Version**: 0.1.0-beta
**Status**: 🔍 Beta - Ready for Public Testing
**Last Updated**: 2025-11-29

---

**Need Help?** Check the [Troubleshooting](#troubleshooting) section or open an issue!
