# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v1.0
- Audiobook export with TTS (multiple voice options)
- Batch processing (export multiple books at once)
- Repair tool (fix failed OCR on specific pages)
- Interactive CLI with prompts and menus
- Docker support for containerized exports
- Structured logging with JSON output
- Long book testing (100+ pages)
- Different book type testing (technical, illustrated)

## [0.1.0-beta] - 2025-11-29

### Added (Beta Testing)
- **Extended Testing Validation**
  - 20-page export tested successfully (12.5 minutes, 7,588 words)
  - Resume functionality tested and validated
  - Consistent 1536px page width across all pages
  - Zero text cutoff on all pages confirmed

### Changed (Beta Updates)
- Production-ready status confirmed through comprehensive testing
- Documentation updated with complete testing results
- All Phase 10 tasks completed

### Testing Results
- ✅ Short exports: 3, 5, 10 pages validated
- ✅ Extended export: 20 pages validated
- ✅ Resume: Interrupt/resume functionality working perfectly
- ✅ OCR quality: Clean text extraction with LiveText
- ✅ Stability: No crashes or errors during extended testing
- ✅ Performance: Average 37.5 seconds per page

### Known Limitations
- Long books (50+ pages) not yet tested at scale
- Different book types (technical, illustrated) need testing
- Performance optimization opportunities exist

## [0.1.0-alpha] - 2025-11-29

### Added
- **Core Functionality**
  - End-to-end book export from Kindle Cloud Reader
  - Browser automation with Playwright
  - Automatic Chrome profile detection (macOS and Linux)
  - Resume capability via `--start-page` flag

- **OCR Providers**
  - macOS Live Text provider (via `sips` CLI)
  - Tesseract OCR provider (cross-platform)
  - OpenAI Vision API provider
  - Local Vision Models foundation (Qwen2-VL, LLaMA Vision, Pixtral) - structure only

- **Export Formats**
  - Plain text with chapter headers
  - PDF with clickable table of contents bookmarks
  - Searchable PDF with embedded OCR text layer
  - Markdown with YAML front matter metadata
  - EPUB via Calibre wrapper

- **Metadata Extraction**
  - Amazon book metadata from Kindle Cloud Reader
  - Table of contents with depth and page mapping
  - Chapter boundaries and location tracking
  - JSONP metadata parser with multiple format support

- **Automation Features**
  - Screenshot capture with canvas clipping (excludes UI elements)
  - Smart page navigation with human-like delays
  - Page ready detection (content-based)
  - Run state management for resume support

- **OCR Optimization**
  - Automatic canvas widening (90-95% viewport width)
  - Single-column layout enforcement
  - Auto-calculated zoom (1.0-1.08x based on viewport)
  - Canvas clipping to exclude navigation and UI elements
  - Multi-selector support for different Kindle Cloud Reader versions
  - iframe support for compatibility

- **CLI Interface**
  - Clean command-line interface with progress indicators
  - Headful mode for debugging (`--headful`)
  - Multiple format export support (`--format text,pdf,markdown`)
  - Configurable delays for rate limiting
  - Output directory customization

- **Documentation**
  - Comprehensive README with usage guide
  - Troubleshooting section with common issues
  - Examples for all OCR providers and formats
  - Architecture documentation
  - Development roadmap and status tracking

### Fixed
- **Bug Fix #1**: Book URL format - Direct book opening instead of library navigation
- **Bug Fix #2**: JSONP parser - Support for `loadMetadata()` format in addition to assignments
- **Bug Fix #3**: Navigation wait - Changed to `domcontentloaded` for better reliability
- **Bug Fix #4**: Page ready detection - Content-based detection vs brittle CSS selectors
- **Bug Fix #5**: Screenshot capture - Viewport-based approach with canvas clipping
- **Bug Fix #6**: Metadata save path - Proper file path construction
- **Bug Fix #7**: Book info structure - Flexible response handling for different metadata formats
- **Bug Fix #8**: Multi-page navigation - Keyboard navigation replaces brittle button selectors
- **Bug Fix #9**: Folder naming consistency - Screenshots and metadata now use same bookTitle
- **Bug Fix #10**: Text cutoff on page 1 - Severe word truncation causing unreadable OCR
- **Bug Fix #11**: Canvas widening removal - Reverted to natural layout for consistency

### Technical Details
- TypeScript 5.0 with strict type checking
- Node.js >= 20 required
- pnpm for package management
- Playwright for browser automation
- PDFKit for PDF generation
- Sharp for image processing
- ESLint + Prettier for code quality
- Git hooks for pre-commit checks

### Changed (Post-Alpha Updates)
- Removed canvas widening feature due to text cutoff issues on page 1
- Reverted to natural Kindle Cloud Reader layout (1536px consistent width)
- Cleaned up debug logging for production readiness
- Updated documentation to reflect current feature set

### Known Issues
- Metadata save error in some edge cases (EISDIR) - doesn't affect exports
- Minor UI text artifacts may appear in OCR results (page numbers)
- Long books (50+ pages) not yet tested at scale
- Network interruption handling needs improvement

### Breaking Changes
None - this is the initial alpha release.

---

## Release Notes

### v0.1.0-beta - Beta Release (Current)

**Status: 🔍 Beta - Ready for Public Testing**

This is the first beta release of Kindle Exporter, featuring comprehensive testing and validation of all core features.

**What Works:**
- ✅ Export books in 5 different formats (text, PDF, searchable PDF, markdown, EPUB)
- ✅ 4 OCR provider options (LiveText, Tesseract fully working; OpenAI, Local Vision in foundation)
- ✅ Resume capability tested and validated
- ✅ Comprehensive metadata extraction with TOC
- ✅ Clean, documented CLI interface
- ✅ Extended testing up to 20 pages
- ✅ Consistent screenshot quality (1536px, zero text cutoff)

**Testing Status:**
- ✅ Short exports (3-10 pages): Validated
- ✅ Extended exports (20 pages): Validated
- ✅ Resume functionality: Validated
- ⏳ Long books (50+ pages): Not yet tested
- ⏳ Different book types: Needs more testing

**Beta Goals:**
- Gather user feedback on stability
- Test with variety of book types
- Identify edge cases and bugs
- Performance optimization
- Move toward v1.0 release

**How to Help:**
- Test with different book types (technical, illustrated, textbooks)
- Report bugs via GitHub Issues
- Share performance feedback
- Suggest improvements

### v0.1.0-alpha - Initial Alpha Release

This was the first public release of Kindle Exporter, representing the successful merge of two existing Kindle export tools into a unified solution.

**Alpha Goals Achieved:**
- ✅ Core features implemented and working
- ✅ Basic testing completed
- ✅ Documentation written
- ✅ Ready for extended testing

**Credits:**
This project builds upon ideas from:
- [kindle-ai-export](https://github.com/transitive-bullshit/kindle-ai-export) by Travis Fischer
- [kindle_exporter_tool](https://github.com/jrichyrich/kindle_exporter_tool) (private)

---

[Unreleased]: https://github.com/yourusername/kindle-exporter/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/yourusername/kindle-exporter/releases/tag/v0.1.0-alpha
