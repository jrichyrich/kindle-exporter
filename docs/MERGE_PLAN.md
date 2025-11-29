# Comprehensive Merge Plan: Kindle Export Tools
## Executive Summary

This document provides a detailed plan for merging two Kindle book export repositories:
- **Public Repository**: `kindle-ai-export` by transitive-bullshit
- **Private Repository**: `kindle_exporter_tool` by jrichyrich

The goal is to create a unified, improved tool that combines the best features of both projects while maintaining code quality, usability, and extensibility.

---

## Table of Contents

1. [Repository Analysis](#1-repository-analysis)
2. [Comparative Analysis](#2-comparative-analysis)
3. [Feature Selection Plan](#3-feature-selection-plan)
4. [Merging Strategy](#4-merging-strategy)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Testing & Validation](#6-testing--validation)
7. [Documentation Requirements](#7-documentation-requirements)

---

## 1. Repository Analysis

### 1.1 Public Repository: kindle-ai-export

#### Overview
- **Repository**: https://github.com/transitive-bullshit/kindle-ai-export
- **Primary Language**: TypeScript/Node.js
- **Package Manager**: pnpm
- **Lines of Code**: ~1,811 (source files only)
- **License**: MIT
- **Node Version**: >= 20

#### Key Features
1. **Multi-format Export**: Text, PDF, EPUB, Markdown, and AI-narrated audiobooks
2. **Screenshot-based Capture**: Uses Playwright to screenshot each page of Kindle web reader
3. **AI Transcription**: Uses OpenAI's vision models (gpt-4.1-mini by default) to transcribe screenshots to text
4. **Audiobook Generation**: Supports multiple TTS engines (OpenAI TTS, Unreal Speech)
5. **Complete Metadata Extraction**: Captures book metadata, table of contents, position mapping
6. **Format Conversion**: PDF (PDFKit), EPUB (via Calibre), Markdown

#### Architecture & Design Patterns
- **Modular Script Architecture**: Separate scripts for each step
  - `extract-kindle-book.ts`: Screenshot capture (634 LOC)
  - `transcribe-book-content.ts`: OCR/transcription (151 LOC)
  - `export-book-pdf.ts`: PDF generation (110 LOC)
  - `export-book-markdown.ts`: Markdown export (92 LOC)
  - `export-book-audio.ts`: Audiobook creation (390 LOC)
- **Pipeline Pattern**: Sequential execution of extraction → transcription → export
- **Data Persistence**: JSON-based metadata and content storage
- **Browser Automation**: Patchright (Playwright fork) with persistent browser contexts

#### Dependencies (Key Libraries)
```json
{
  "playwright": "^1.56.1",
  "patchright": "^1.56.1",
  "openai-fetch": "^3.4.2",
  "pdfkit": "^0.15.0",
  "sharp": "^0.34.4",
  "fluent-ffmpeg": "^2.1.3",
  "unrealspeech-api": "^1.0.2",
  "p-map": "^7.0.3"
}
```

#### Data Structures
```typescript
interface BookMetadata {
  meta: AmazonBookMeta        // Author, title, ASIN, etc.
  info: AmazonBookInfo        // DRM info, last read position
  nav: Nav                     // Page navigation info
  toc: TocItem[]              // Table of contents
  pages: PageChunk[]          // Screenshot references
  locationMap: AmazonRenderLocationMap
}

interface ContentChunk {
  index: number
  page: number
  text: string
  screenshot: string
}
```

#### Strengths
1. **Rich Feature Set**: Most comprehensive export capabilities (5 formats + audiobooks)
2. **AI-Powered OCR**: High accuracy using vision LLMs
3. **Metadata Preservation**: Keeps Kindle sync positions and full TOC
4. **Production Quality**: Well-documented, tested, active maintenance
5. **Format Flexibility**: Multiple output formats for different use cases

#### Weaknesses
1. **Cost**: LLM-based OCR costs ~$1-3 per book
2. **No Resume Capability**: Cannot easily resume interrupted exports
3. **Sequential Processing**: Transcription happens after all screenshots captured
4. **Limited OCR Options**: Only supports LLM-based transcription (no Tesseract/Live Text)
5. **No Built-in CLI**: Requires running separate scripts with npx tsx
6. **2FA Manual**: Requires manual code entry for 2FA

---

### 1.2 Private Repository: kindle_exporter_tool

#### Overview
- **Repository**: https://github.com/jrichyrich/kindle_exporter_tool
- **Primary Language**: TypeScript/Node.js
- **Package Manager**: npm
- **Lines of Code**: ~2,036 (source files only)
- **License**: Not specified (assumed MIT)
- **Node Version**: >= 20

#### Key Features
1. **Local OCR Support**: macOS Live Text and Tesseract
2. **Resume Capability**: Persistent run-state allows resuming interrupted exports
3. **Multiple Capture Modes**: OCR-only, PDF, and searchable PDF (PDF+OCR)
4. **Batch OCR**: Parallel OCR processing with configurable concurrency
5. **Unified CLI**: Single command-line interface with comprehensive flags
6. **Repair Tool**: Standalone utility to fix/re-OCR missing or failed pages
7. **Docker Support**: Linux-compatible containerized deployment
8. **Human-like Pacing**: Randomized delays (3-5s) to avoid detection

#### Architecture & Design Patterns
- **Unified CLI Architecture**: Single entry point with command flags
  - `cli.ts`: Main CLI orchestrator (173 LOC)
  - `automation/exporter.ts`: Core export logic (~400 LOC)
  - `automation/browser.ts`: Browser session management
  - `ocr/`: Pluggable OCR providers (LiveText, Tesseract)
  - `postProcessing/pdf.ts`: PDF compilation
  - `utils/`: Supporting utilities (runState, logger, fileSystem, hooks)
- **State Machine Pattern**: Persistent run state for resume functionality
- **Strategy Pattern**: Pluggable OCR providers (LiveText vs Tesseract)
- **Observer Pattern**: Structured logging with JSON support
- **Hook System**: Post-processing hooks for custom workflows

#### Dependencies (Key Libraries)
```json
{
  "playwright": "^1.42.0",
  "commander": "^11.1.0",
  "chalk": "^5.3.0",
  "ora": "^7.0.1",
  "dotenv": "^16.4.5",
  "zod": "^3.22.4"
}
```

#### Data Structures
```typescript
interface ToolConfig {
  chromeProfilePath: string
  outputDir: string
  delayMinMs: number
  delayMaxMs: number
  ocrEngine: "livetext" | "tesseract"
  ocrLang?: string
}

interface RunState {
  bookTitle: string
  lastPage: number
  totalPages?: number
  status: "in-progress" | "completed" | "failed"
  startTime: string
  endTime?: string
}
```

#### Strengths
1. **Resume Capability**: Can resume interrupted exports (critical for long books)
2. **Free OCR Options**: Live Text (macOS) and Tesseract (cross-platform)
3. **Production-Ready CLI**: Comprehensive flag system, interactive prompts
4. **Repair Functionality**: Standalone tool to fix failed OCR
5. **Structured Logging**: JSON logs for programmatic processing
6. **Resource Efficiency**: No LLM costs, runs locally
7. **Platform Support**: Docker for Linux, native for macOS
8. **Batch Processing**: Parallel OCR with configurable concurrency
9. **Better UX**: Progress indicators, colored output, interactive prompts
10. **Configuration Management**: Zod-based schema validation

#### Weaknesses
1. **Limited Export Formats**: No audiobook, EPUB, or markdown support
2. **Lower OCR Accuracy**: Traditional OCR less accurate than vision LLMs
3. **No Metadata Extraction**: Doesn't capture Amazon metadata, TOC, sync positions
4. **Manual Book Selection**: User must manually open book (not automated)
5. **No AI Features**: No LLM-based transcription or TTS
6. **Less Mature**: Marked as "WIP" (Work In Progress)
7. **No Format Conversion**: Relies on external tools (img2pdf, ocrmypdf)

---

## 2. Comparative Analysis

### 2.1 Feature Comparison Matrix

| Feature | kindle-ai-export | kindle_exporter_tool | Winner |
|---------|------------------|----------------------|--------|
| **Automation** |
| Automated book selection | ✅ Yes (via ASIN) | ❌ Manual | Public |
| Automated 2FA handling | ⚠️ Manual prompt | ⚠️ Manual prompt | Tie |
| Auto-detect end of book | ✅ Yes | ✅ Yes | Tie |
| Human-like delays | ⚠️ Fixed | ✅ Randomized | Private |
| Resume capability | ❌ No | ✅ Yes | Private |
| **OCR & Transcription** |
| Vision LLM OCR | ✅ Yes (GPT-4.1) | ❌ No | Public |
| Local OCR (Live Text) | ❌ No | ✅ Yes | Private |
| Local OCR (Tesseract) | ❌ No | ✅ Yes | Private |
| Batch OCR | ❌ Sequential | ✅ Parallel | Private |
| OCR retry/fallback | ⚠️ Limited | ✅ Yes | Private |
| Estimated OCR accuracy | 98%+ | 90-95% | Public |
| **Export Formats** |
| Plain text | ✅ Yes | ✅ Yes | Tie |
| PDF | ✅ Yes (w/ TOC) | ✅ Yes | Public |
| Searchable PDF | ❌ No | ✅ Yes (OCRmyPDF) | Private |
| EPUB | ✅ Yes (via Calibre) | ❌ No | Public |
| Markdown | ✅ Yes | ❌ No | Public |
| Audiobook (TTS) | ✅ Yes (2 engines) | ❌ No | Public |
| **Metadata & Structure** |
| Book metadata | ✅ Full | ❌ Minimal | Public |
| Table of contents | ✅ Yes | ❌ No | Public |
| Position mapping | ✅ Yes | ❌ No | Public |
| Page numbering | ✅ Yes | ✅ Yes | Tie |
| **User Experience** |
| CLI interface | ⚠️ Multiple scripts | ✅ Unified | Private |
| Interactive prompts | ❌ No | ✅ Yes | Private |
| Progress indicators | ❌ Basic | ✅ Spinners/colors | Private |
| Structured logging | ❌ No | ✅ JSON support | Private |
| Config validation | ⚠️ Basic | ✅ Zod schemas | Private |
| Dry-run mode | ❌ No | ✅ Yes | Private |
| **Reliability & Maintenance** |
| Resume failed exports | ❌ No | ✅ Yes | Private |
| Repair tool | ❌ No | ✅ Yes | Private |
| Error handling | ⚠️ Basic | ✅ Comprehensive | Private |
| Run state persistence | ❌ No | ✅ Yes | Private |
| Post-processing hooks | ❌ No | ✅ Yes | Private |
| **Platform Support** |
| macOS | ✅ Yes | ✅ Yes | Tie |
| Linux | ⚠️ Limited | ✅ Docker | Private |
| Windows | ⚠️ Untested | ⚠️ Untested | Tie |
| **Code Quality** |
| Type safety | ✅ TypeScript | ✅ TypeScript | Tie |
| Testing | ⚠️ Minimal | ⚠️ Vitest setup | Tie |
| Documentation | ✅ Excellent | ⚠️ Good | Public |
| Code organization | ✅ Modular | ✅ Modular | Tie |
| **Resource Usage** |
| LLM API costs | ❌ $1-3/book | ✅ Free | Private |
| Processing speed | ⚠️ Slower (API) | ✅ Faster (local) | Private |
| Memory usage | ⚠️ Moderate | ✅ Low | Private |

### 2.2 Evaluation Criteria Assessment

#### 2.2.1 Level of Automation
**Winner: kindle-ai-export (Public)**
- Fully automates book selection via ASIN
- Automatically navigates to specific book
- Private repo requires manual book opening

#### 2.2.2 Ease of Use (Non-Technical Users)
**Winner: kindle_exporter_tool (Private)**
- Unified CLI with clear flags
- Interactive prompts for missing values
- Better error messages and progress indicators
- Dry-run mode for testing
- Resume capability reduces frustration

#### 2.2.3 Richness of Features
**Winner: kindle-ai-export (Public)**
- 5 export formats vs 2
- Audiobook generation (unique)
- Full metadata extraction
- TOC preservation
- Higher OCR accuracy

#### 2.2.4 Flexibility & Extensibility
**Winner: kindle_exporter_tool (Private)**
- Pluggable OCR providers
- Post-processing hooks
- Multiple capture modes
- Configurable concurrency
- Docker support for cross-platform

#### 2.2.5 Performance & Efficiency
**Winner: kindle_exporter_tool (Private)**
- Free OCR (no API costs)
- Parallel batch processing
- Lower memory footprint
- Resume capability saves time
- Faster local OCR

#### 2.2.6 Code Quality & Maintainability
**Winner: Tie (Both Strong)**
- Both use TypeScript with good type safety
- Both have modular architectures
- Public has better documentation
- Private has better error handling
- Both could use more tests

#### 2.2.7 Documentation & Test Coverage
**Winner: kindle-ai-export (Public)**
- Excellent README with examples
- Detailed usage instructions
- Screenshots and videos
- Private is marked as "WIP"
- Both lack comprehensive tests

### 2.3 Unique Features by Repository

#### Public (kindle-ai-export) Unique Features
1. AI-powered transcription with vision LLMs
2. Audiobook generation (OpenAI TTS, Unreal Speech)
3. EPUB export
4. Markdown export
5. Full Amazon metadata extraction
6. TOC with navigation
7. Kindle sync position preservation
8. Automated book selection via ASIN
9. Higher transcription accuracy (~98%+)

#### Private (kindle_exporter_tool) Unique Features
1. Resume capability with persistent state
2. Live Text OCR (macOS native)
3. Tesseract OCR (cross-platform)
4. Repair tool for fixing failed pages
5. Batch OCR with parallel processing
6. Searchable PDF generation
7. Unified CLI interface
8. Interactive prompts and dry-run
9. Structured JSON logging
10. Post-processing hooks
11. Docker support
12. Config validation with Zod
13. Human-like randomized delays
14. Free local OCR (no API costs)

---

## 3. Feature Selection Plan

### 3.1 Selection Criteria

Features will be evaluated based on:

1. **User Value**: How much does this benefit typical users?
2. **Technical Feasibility**: How easy is it to implement/merge?
3. **Maintainability**: Will this be sustainable long-term?
4. **Future Extensibility**: Does this enable future enhancements?
5. **Resource Efficiency**: What are the computational/cost tradeoffs?

Rating scale: High (3), Medium (2), Low (1)

### 3.2 Feature Priority Matrix

#### Priority 1: Must-Have (Critical Path)

| Feature | Source | Value | Feasibility | Maintainability | Extensibility | Efficiency | Total | Notes |
|---------|--------|-------|-------------|-----------------|---------------|-----------|-------|-------|
| Screenshot capture | Both | 3 | 3 | 3 | 3 | 3 | 15 | Core functionality |
| Multiple OCR options | Both | 3 | 3 | 3 | 3 | 3 | 15 | Flexibility for users |
| Resume capability | Private | 3 | 3 | 3 | 3 | 3 | 15 | Critical for reliability |
| Unified CLI | Private | 3 | 3 | 3 | 3 | 3 | 15 | Better UX |
| PDF export | Both | 3 | 3 | 3 | 3 | 3 | 15 | Common use case |
| Progress indicators | Private | 3 | 3 | 3 | 2 | 3 | 14 | UX enhancement |
| Config validation | Private | 3 | 3 | 3 | 3 | 3 | 15 | Error prevention |

#### Priority 2: Should-Have (High Value)

| Feature | Source | Value | Feasibility | Maintainability | Extensibility | Efficiency | Total | Notes |
|---------|--------|-------|-------------|-----------------|---------------|-----------|-------|-------|
| Metadata extraction | Public | 3 | 2 | 2 | 3 | 3 | 13 | Enables TOC, sync |
| TOC extraction | Public | 3 | 2 | 2 | 3 | 3 | 13 | Better navigation |
| Batch OCR | Private | 3 | 3 | 3 | 2 | 3 | 14 | Performance boost |
| Repair tool | Private | 3 | 2 | 2 | 2 | 3 | 12 | Reliability |
| Searchable PDF | Private | 3 | 2 | 2 | 2 | 2 | 11 | Added value |
| Dry-run mode | Private | 2 | 3 | 3 | 2 | 3 | 13 | Testing/debugging |
| Structured logging | Private | 2 | 3 | 3 | 3 | 3 | 14 | Observability |
| Auto book selection | Public | 2 | 2 | 2 | 2 | 3 | 11 | Convenience |

#### Priority 3: Nice-to-Have (Optional)

| Feature | Source | Value | Feasibility | Maintainability | Extensibility | Efficiency | Total | Notes |
|---------|--------|-------|-------------|-----------------|---------------|-----------|-------|-------|
| Audiobook TTS | Public | 2 | 2 | 2 | 2 | 1 | 9 | Niche use case |
| EPUB export | Public | 2 | 2 | 2 | 2 | 3 | 11 | Format diversity |
| Markdown export | Public | 2 | 3 | 3 | 2 | 3 | 13 | Easy to add |
| Post-processing hooks | Private | 2 | 3 | 3 | 3 | 3 | 14 | Extensibility |
| Docker support | Private | 2 | 2 | 2 | 2 | 2 | 10 | Linux support |
| Interactive prompts | Private | 2 | 3 | 3 | 2 | 3 | 13 | UX polish |

### 3.3 Selected Features for Merge

#### Core Architecture (From Private Repo)
- ✅ Unified CLI with Commander
- ✅ Interactive prompts for missing config
- ✅ Zod-based configuration validation
- ✅ Persistent run-state with resume capability
- ✅ Structured logging (console + JSON file)
- ✅ Progress indicators with Ora and Chalk
- ✅ Post-processing hook system

#### Browser Automation (Best of Both)
- ✅ Playwright-based automation (both repos)
- ✅ Persistent browser context (public)
- ✅ Automated book selection via ASIN (public)
- ✅ Randomized human-like delays (private)
- ✅ Robust next-page detection (private)
- ✅ Reading canvas clip detection (private)

#### OCR & Transcription (From Both)
- ✅ Pluggable OCR provider architecture (private)
- ✅ Live Text support (macOS) (private)
- ✅ Tesseract support (cross-platform) (private)
- ✅ Vision LLM support (OpenAI) (public)
- ✅ Batch OCR with concurrency (private)
- ✅ OCR retry and fallback logic (private)
- ✅ Per-page and batch OCR modes (private)

#### Metadata & Structure (From Public)
- ✅ Full Amazon metadata extraction (public)
- ✅ Table of contents parsing (public)
- ✅ Location/position mapping (public)
- ✅ Chapter boundary detection (public)

#### Export Formats
- ✅ Plain text (both)
- ✅ PDF with TOC (public)
- ✅ Searchable PDF via OCRmyPDF (private)
- ✅ Markdown (public)
- ✅ EPUB via Calibre (public)
- ✅ Audiobook with TTS (public) - Optional/Plugin

#### Tools & Utilities
- ✅ Repair tool for failed OCR (private)
- ✅ Dry-run mode (private)
- ✅ Resume from specific page (private)
- ✅ Open folder on completion (private)

#### Platform Support
- ✅ macOS native (both)
- ✅ Linux via Docker (private)
- ⚠️ Windows (future consideration)

### 3.4 Features to Defer or Exclude

#### Excluded (Can add later as plugins)
- ❌ Multiple TTS engines - Complex, niche use case
- ❌ Unreal Speech integration - Can add as plugin
- ❌ Canvas widening - Edge case, unstable

#### Deferred (Post-MVP)
- 🔜 Windows native support
- 🔜 Web UI
- 🔜 Bulk export (multiple books)
- 🔜 Cloud storage integration
- 🔜 Calibre library integration

---

## 4. Merging Strategy

### 4.1 Base Repository Selection

**Decision: Use `kindle_exporter_tool` (Private) as the base**

**Rationale:**
1. **Better Architecture**: Unified CLI, state management, error handling
2. **Resume Capability**: Critical for reliability (hard to retrofit)
3. **Extensibility**: Hook system, pluggable providers
4. **User Experience**: Better CLI, logging, prompts
5. **Easier to Add Features**: Simpler to add public repo's features than vice versa

**Migration Path:**
- Start with private repo structure
- Port public repo features as modules
- Preserve public repo's data structures where appropriate

### 4.2 Project Structure

```
kindle-exporter/
├── src/
│   ├── cli.ts                    # Main CLI entry point (from Private)
│   ├── config.ts                 # Configuration management (from Private)
│   ├── types.ts                  # Combined type definitions
│   │
│   ├── automation/
│   │   ├── browser.ts            # Browser session management (from Private)
│   │   ├── exporter.ts           # Main export loop (from Private, enhanced)
│   │   ├── kindleReader.ts       # Kindle-specific automation (from Public)
│   │   └── navigation.ts         # Page navigation logic (from Both)
│   │
│   ├── ocr/
│   │   ├── index.ts              # OCR provider factory (from Private)
│   │   ├── types.ts              # OCR provider interface (from Private)
│   │   ├── livetext.ts           # Live Text provider (from Private)
│   │   ├── tesseract.ts          # Tesseract provider (from Private)
│   │   ├── openai.ts             # OpenAI vision provider (NEW - from Public)
│   │   ├── localVision.ts        # Local vision model provider (NEW - Qwen/LLaMA)
│   │   └── batchOcr.ts           # Batch OCR orchestration (from Private)
│   │
│   ├── metadata/
│   │   ├── extractor.ts          # Extract Amazon metadata (NEW - from Public)
│   │   ├── parser.ts             # Parse TOC, nav data (NEW - from Public)
│   │   └── types.ts              # Metadata types (from Public)
│   │
│   ├── exporters/
│   │   ├── text.ts               # Plain text export (from Both)
│   │   ├── pdf.ts                # PDF export (from Public, enhanced)
│   │   ├── searchablePdf.ts      # Searchable PDF (from Private)
│   │   ├── markdown.ts           # Markdown export (from Public)
│   │   ├── epub.ts               # EPUB export (from Public)
│   │   └── audio.ts              # Audiobook TTS (from Public) - Optional
│   │
│   ├── utils/
│   │   ├── fileSystem.ts         # File operations (from Private)
│   │   ├── logger.ts             # Structured logging (from Private)
│   │   ├── runState.ts           # Persistent state (from Private)
│   │   ├── prompt.ts             # Interactive prompts (from Private)
│   │   ├── hooks.ts              # Post-processing hooks (from Private)
│   │   ├── openFolder.ts         # Open folder utility (from Private)
│   │   └── helpers.ts            # Shared utilities (from Public)
│   │
│   └── tools/
│       ├── repair.ts             # OCR repair tool (from Private)
│       └── migrate.ts            # Migrate old exports (NEW)
│
├── scripts/
│   ├── setup.sh                  # One-time setup (from Private)
│   ├── preflight.sh              # Dependency checks (from Private)
│   ├── make_pdf.sh               # PDF helper (from Private)
│   └── livetext_ocr.swift        # Swift helper (from Private)
│
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── smoke/                    # Smoke tests (from Private)
│
├── docs/
│   ├── README.md                 # Main documentation
│   ├── USAGE.md                  # Usage guide
│   ├── API.md                    # API documentation
│   ├── ARCHITECTURE.md           # Architecture overview
│   └── MIGRATION.md              # Migration guide from old tools
│
├── examples/                     # Example outputs (from Public)
│
├── .env.example                  # Environment template
├── package.json                  # Package manifest
├── tsconfig.json                 # TypeScript config
├── Dockerfile                    # Docker support (from Private)
└── LICENSE                       # MIT License
```

### 4.3 Code Integration Strategy

#### Phase 1: Foundation (Week 1)
1. **Initialize merged repo**
   - Fork private repo as base
   - Add public repo as remote
   - Create integration branch

2. **Update dependencies**
   - Merge package.json dependencies
   - Update to latest compatible versions
   - Resolve conflicts (prefer latest stable)

3. **Unify type system**
   - Merge `types.ts` from both repos
   - Create `metadata/types.ts` for public repo types
   - Ensure no type conflicts

4. **Update configuration**
   - Add ASIN support to config
   - Add OpenAI API key config
   - Add export format options
   - Keep Zod validation

#### Phase 2: OCR Integration (Week 1-2)
1. **Add OpenAI OCR provider**
   - Create `ocr/openai.ts` based on public repo
   - Implement `OcrProvider` interface
   - Add to provider factory
   - Support batch and streaming modes

2. **Enhance OCR orchestration**
   - Update `batchOcr.ts` for vision LLMs
   - Add cost estimation for LLM OCR
   - Implement hybrid strategies (LLM + local fallback)

3. **Test OCR integration**
   - Unit tests for each provider
   - Integration tests for provider switching
   - Benchmark accuracy and speed

#### Phase 3: Metadata Extraction (Week 2)
1. **Port metadata extraction**
   - Create `metadata/extractor.ts`
   - Port network interception from public repo
   - Extract Amazon metadata, TOC, location map

2. **Integrate with exporter**
   - Update `automation/exporter.ts`
   - Add metadata extraction phase
   - Store metadata in run state

3. **Update data models**
   - Extend `RunState` with metadata
   - Save metadata.json alongside exports
   - Preserve backward compatibility

#### Phase 4: Export Formats (Week 2-3)
1. **Enhanced PDF export**
   - Port `export-book-pdf.ts` logic
   - Add TOC navigation to PDFKit
   - Integrate with metadata

2. **Add Markdown export**
   - Port `export-book-markdown.ts`
   - Support chapter boundaries
   - Format TOC as markdown list

3. **Add EPUB support**
   - Port Calibre integration
   - Document conversion process
   - Add as optional post-processing step

4. **Add audiobook support (optional)**
   - Port `export-book-audio.ts`
   - Add TTS provider abstraction
   - Support OpenAI TTS as first provider
   - Make fully optional (separate install)

#### Phase 5: Automation Enhancements (Week 3)
1. **Add ASIN-based book selection**
   - Port book selection logic from public
   - Add to automation workflow
   - Make optional (can still do manual)

2. **Improve browser automation**
   - Port settings changes (font, layout)
   - Add reader initialization from public
   - Combine with private repo's navigation

3. **Enhance end-of-book detection**
   - Merge detection strategies
   - Add multiple fallback methods

#### Phase 6: CLI & UX (Week 3-4)
1. **Extend CLI flags**
   - Add format selection flags
   - Add ASIN flag
   - Add OCR provider selection
   - Add metadata-only mode

2. **Update prompts**
   - Add format selection prompt
   - Add OCR provider prompt
   - Add ASIN entry prompt

3. **Enhance logging**
   - Add phase logging (screenshot → OCR → export)
   - Add progress estimates
   - Add cost estimates for LLM OCR

#### Phase 7: Testing & Documentation (Week 4)
1. **Comprehensive testing**
   - Unit tests for all new modules
   - Integration tests for full workflow
   - Smoke tests for each format
   - Performance benchmarks

2. **Update documentation**
   - Merge README content
   - Document all features
   - Add migration guide
   - Create architecture docs

3. **Example outputs**
   - Generate examples for each format
   - Include metadata examples
   - Add cost/time benchmarks

### 4.4 Conflict Resolution

#### Dependency Conflicts
- **Playwright versions**: Use latest (1.56.1 from public)
- **Node version**: Require >=20 (both)
- **Package manager**: Use pnpm (more reliable, from public)

#### Code Style Conflicts
- **Linting**: Use ESLint from public (more comprehensive)
- **Formatting**: Use Prettier from public
- **Import style**: Use ES modules (both compatible)

#### Architectural Conflicts
- **Browser context**: Use patchright from public (better for Kindle)
- **State management**: Use private's RunState (more robust)
- **Error handling**: Use private's approach (more comprehensive)
- **Logging**: Use private's Logger (more flexible)

#### Feature Conflicts
- **OCR timing**: Support both per-page and batch (configurable)
- **Book selection**: Support both ASIN and manual (user choice)
- **Delays**: Use randomized from private (better)

### 4.5 Data Migration

#### Migrate Public Repo Exports
```typescript
// src/tools/migrate.ts
import { BookMetadata } from '../metadata/types'
import { RunState } from '../utils/runState'

async function migratePublicExport(asin: string) {
  // Read out/${asin}/metadata.json
  // Read out/${asin}/content.json
  // Convert to new RunState format
  // Create run-state.json
  // Preserve all screenshots and text
}
```

#### Migrate Private Repo Exports
```typescript
// No migration needed - already compatible
// But enhance with metadata if available
async function enhancePrivateExport(bookFolder: string) {
  // Check if run-state.json exists
  // Add metadata extraction step
  // Update run-state with metadata
}
```

---

## 5. Implementation Roadmap

### 5.1 Development Phases

#### Phase 1: Foundation Setup (Days 1-3)
**Goal**: Establish merged repository with unified dependencies

**Tasks**:
- [ ] Create new repository: `kindle-exporter-unified`
- [ ] Copy private repo as base
- [ ] Add public repo files to separate branch
- [ ] Merge package.json dependencies
- [ ] Resolve dependency conflicts
- [ ] Update tsconfig.json
- [ ] Set up pnpm workspace
- [ ] Configure ESLint + Prettier
- [ ] Set up Git hooks
- [ ] Create initial documentation structure

**Deliverables**:
- ✅ Merged repository with clean build
- ✅ Updated package.json with all dependencies
- ✅ TypeScript compiling successfully
- ✅ Linting and formatting configured

#### Phase 2: Type System Integration (Days 3-5)
**Goal**: Merge type definitions from both repositories

**Tasks**:
- [ ] Create `src/metadata/types.ts` for public types
- [ ] Port `BookMetadata`, `ContentChunk`, etc.
- [ ] Update `src/types.ts` with merged types
- [ ] Add `CaptureMode` extensions for new formats
- [ ] Create type adapters where needed
- [ ] Ensure no circular dependencies
- [ ] Add JSDoc comments
- [ ] Generate type documentation

**Deliverables**:
- ✅ Unified type system
- ✅ No type conflicts
- ✅ Clear type documentation

#### Phase 3: OCR Provider Integration (Days 5-10)
**Goal**: Add cloud and local vision LLM OCR providers

**Tasks - OpenAI Vision Provider**:
- [ ] Create `src/ocr/openai.ts`
- [ ] Implement `OcrProvider` interface
- [ ] Port transcription logic from public
- [ ] Add retry logic with temperature adjustment
- [ ] Implement cost estimation
- [ ] Add to provider factory
- [ ] Update config for OpenAI API key
- [ ] Add provider selection to CLI
- [ ] Write unit tests
- [ ] Benchmark accuracy vs local OCR

**Tasks - Local Vision Model Provider**:
- [ ] Create `src/ocr/localVision.ts`
- [ ] Implement `OcrProvider` interface for local models
- [ ] Add support for Qwen2-VL (7B/72B)
- [ ] Add support for LLaMA 3.2 Vision (11B/90B)
- [ ] Add support for Pixtral (12B)
- [ ] Integrate with transformers.js or @huggingface/transformers
- [ ] Add model download and caching logic
- [ ] Implement GPU acceleration (CUDA/Metal)
- [ ] Add CPU fallback with quantization (4-bit/8-bit)
- [ ] Add batch processing for efficiency
- [ ] Create model management CLI commands
- [ ] Add memory usage monitoring
- [ ] Document hardware requirements per model
- [ ] Write integration tests
- [ ] Benchmark accuracy, speed, and memory usage

**Deliverables**:
- ✅ OpenAI OCR provider functional
- ✅ Local vision model provider functional
- ✅ Model selection and auto-download working
- ✅ Seamless provider switching
- ✅ Cost/resource estimates displayed
- ✅ Tests passing
- ✅ Performance benchmarks documented

#### Phase 4: Metadata Extraction (Days 10-14)
**Goal**: Extract Amazon metadata, TOC, and position data

**Tasks**:
- [ ] Create `src/metadata/extractor.ts`
- [ ] Port network interception from public
- [ ] Extract YJmetadata.jsonp
- [ ] Extract startReading response
- [ ] Extract render TAR files
- [ ] Parse location map
- [ ] Parse TOC with depth
- [ ] Map positions to pages
- [ ] Integrate with `automation/exporter.ts`
- [ ] Save metadata.json
- [ ] Update RunState with metadata
- [ ] Write integration tests

**Deliverables**:
- ✅ Full metadata extraction working
- ✅ TOC with page numbers
- ✅ Position mapping functional
- ✅ Metadata persisted

#### Phase 5: Export Format Extensions (Days 14-21)
**Goal**: Add PDF (w/ TOC), Markdown, EPUB, and audiobook exports

**Tasks**:
- [ ] Create `src/exporters/` directory
- [ ] Port `export-book-pdf.ts` → `src/exporters/pdf.ts`
- [ ] Add TOC navigation to PDF
- [ ] Port `export-book-markdown.ts` → `src/exporters/markdown.ts`
- [ ] Add chapter markers to markdown
- [ ] Create `src/exporters/epub.ts` (Calibre wrapper)
- [ ] Document EPUB conversion process
- [ ] Create `src/exporters/audio.ts` (optional)
- [ ] Add TTS provider abstraction
- [ ] Support OpenAI TTS
- [ ] Add format selection to CLI
- [ ] Update post-processing hooks
- [ ] Test each format end-to-end

**Deliverables**:
- ✅ PDF with working TOC
- ✅ Clean markdown output
- ✅ EPUB conversion documented
- ✅ Audiobook generation (optional)
- ✅ All formats selectable via CLI

#### Phase 6: Automation Enhancements (Days 21-25)
**Goal**: Add ASIN-based book selection and improved automation

**Tasks**:
- [ ] Create `src/automation/kindleReader.ts`
- [ ] Port book selection from public
- [ ] Add ASIN to config schema
- [ ] Implement reader settings changes
- [ ] Add font/layout configuration
- [ ] Integrate book selection with exporter
- [ ] Make ASIN optional (support manual mode)
- [ ] Add book selection to prompts
- [ ] Handle authentication flow
- [ ] Add 2FA support
- [ ] Test with multiple books

**Deliverables**:
- ✅ ASIN-based book loading
- ✅ Automatic reader configuration
- ✅ Seamless authentication
- ✅ Both manual and auto modes working

#### Phase 7: CLI & UX Polish (Days 25-28)
**Goal**: Create unified, user-friendly CLI experience

**Tasks**:
- [ ] Extend CLI flags for all features
- [ ] Add `--format` flag (text, pdf, epub, markdown, audio)
- [ ] Add `--ocr-provider` flag (livetext, tesseract, openai)
- [ ] Add `--asin` flag for book selection
- [ ] Add `--metadata-only` flag
- [ ] Update interactive prompts
- [ ] Add format selection prompt
- [ ] Add OCR provider comparison in prompts
- [ ] Show cost estimates for LLM OCR
- [ ] Enhance progress indicators
- [ ] Add phase progress (1/5: Screenshots, 2/5: OCR, etc.)
- [ ] Add time remaining estimates
- [ ] Improve error messages
- [ ] Add helpful suggestions on errors

**Deliverables**:
- ✅ Comprehensive CLI with all options
- ✅ Intuitive interactive mode
- ✅ Clear progress feedback
- ✅ Helpful error messages

#### Phase 8: Testing & Quality Assurance (Days 28-32)
**Goal**: Ensure reliability and quality

**Tasks**:
- [ ] Write unit tests for all new modules
- [ ] OCR provider tests
- [ ] Metadata extraction tests
- [ ] Export format tests
- [ ] Write integration tests
- [ ] Full export workflows
- [ ] Resume scenarios
- [ ] Error recovery
- [ ] Smoke tests for each format
- [ ] Performance benchmarks
- [ ] OCR accuracy comparison
- [ ] Export speed comparison
- [ ] Memory usage profiling
- [ ] Long book testing (500+ pages)
- [ ] Edge case testing
- [ ] Books with images
- [ ] Books with unusual layouts
- [ ] Non-English books

**Deliverables**:
- ✅ >80% code coverage
- ✅ All tests passing
- ✅ Performance benchmarks documented
- ✅ Known limitations documented

#### Phase 9: Documentation (Days 32-35)
**Goal**: Comprehensive user and developer documentation

**Tasks**:
- [ ] Write main README.md
- [ ] Feature overview
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Write USAGE.md
- [ ] CLI reference
- [ ] Examples for each format
- [ ] Troubleshooting guide
- [ ] Write ARCHITECTURE.md
- [ ] System design overview
- [ ] Data flow diagrams
- [ ] Extension points
- [ ] Write MIGRATION.md
- [ ] Migrating from public repo
- [ ] Migrating from private repo
- [ ] Data format compatibility
- [ ] Create API.md
- [ ] OCR provider interface
- [ ] Export format interface
- [ ] Hook system API
- [ ] Add JSDoc to all public APIs
- [ ] Generate TypeDoc

**Deliverables**:
- ✅ Complete user documentation
- ✅ Developer documentation
- ✅ Migration guides
- ✅ API reference

#### Phase 10: Release Preparation (Days 35-40)
**Goal**: Prepare for public release

**Tasks**:
- [ ] Create example outputs
- [ ] Example for each format
- [ ] Include metadata examples
- [ ] Add cost/time benchmarks
- [ ] Set up CI/CD
- [ ] GitHub Actions for tests
- [ ] Automated releases
- [ ] Docker image builds
- [ ] Create release checklist
- [ ] Prepare changelog
- [ ] Tag version 1.0.0
- [ ] Publish to npm (optional)
- [ ] Create GitHub release
- [ ] Announce on relevant forums

**Deliverables**:
- ✅ v1.0.0 release ready
- ✅ CI/CD pipeline working
- ✅ Docker images published
- ✅ npm package (optional)

### 5.2 Timeline Summary

| Phase | Duration | Cumulative Days |
|-------|----------|-----------------|
| 1. Foundation Setup | 3 days | 3 |
| 2. Type System Integration | 2 days | 5 |
| 3. OCR Provider Integration | 5 days | 10 |
| 4. Metadata Extraction | 4 days | 14 |
| 5. Export Format Extensions | 7 days | 21 |
| 6. Automation Enhancements | 4 days | 25 |
| 7. CLI & UX Polish | 3 days | 28 |
| 8. Testing & QA | 4 days | 32 |
| 9. Documentation | 3 days | 35 |
| 10. Release Preparation | 5 days | 40 |

**Total Estimated Time**: 40 working days (8 weeks)

### 5.3 Milestones

- **M1**: Foundation Complete (Day 5)
  - Repository set up, types merged, builds successfully
- **M2**: OCR Providers Integrated (Day 10)
  - All OCR options (Live Text, Tesseract, OpenAI, Local Vision Models) functional
- **M3**: Metadata Extraction Working (Day 14)
  - Full Amazon metadata, TOC, position mapping
- **M4**: All Export Formats (Day 21)
  - PDF, Markdown, EPUB, Audiobook all working
- **M5**: Feature Complete (Day 28)
  - All features from both repos integrated
- **M6**: Beta Release (Day 35)
  - Tested, documented, ready for beta users
- **M7**: v1.0 Release (Day 40)
  - Production ready, publicly released

### 5.4 Local Vision Model Implementation Details

#### Overview
Local vision models provide high-accuracy OCR without API costs or internet dependency. This section details the implementation of local vision model support as an OCR provider.

#### Supported Models

| Model | Size | Hardware Req | Speed | Accuracy | Quantization |
|-------|------|-------------|-------|----------|--------------|
| **Qwen2-VL-7B** | 7B params | 16GB RAM/VRAM | Medium | 96-98% | 4-bit/8-bit |
| **Qwen2-VL-72B** | 72B params | 80GB VRAM | Slow | 98-99% | 8-bit only |
| **LLaMA 3.2 Vision 11B** | 11B params | 24GB RAM/VRAM | Medium | 95-97% | 4-bit/8-bit |
| **LLaMA 3.2 Vision 90B** | 90B params | 90GB VRAM | Very Slow | 98-99% | 8-bit only |
| **Pixtral-12B** | 12B params | 24GB RAM/VRAM | Medium-Fast | 96-98% | 4-bit/8-bit |

**Recommended**: Qwen2-VL-7B (4-bit quantized) for best balance of speed, accuracy, and resource usage.

#### Architecture

```typescript
// src/ocr/localVision.ts

import { OcrProvider } from './types'

interface LocalVisionConfig {
  modelName: 'qwen2-vl-7b' | 'qwen2-vl-72b' | 'llama-3.2-vision-11b' | 'llama-3.2-vision-90b' | 'pixtral-12b'
  quantization?: '4bit' | '8bit' | 'fp16' | 'none'
  device?: 'cuda' | 'mps' | 'cpu'
  maxTokens?: number
  temperature?: number
  cacheDir?: string
  batchSize?: number
}

export class LocalVisionProvider implements OcrProvider {
  engine = 'local-vision' as const
  private model: any
  private processor: any
  private config: LocalVisionConfig

  constructor(config: LocalVisionConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    // Download model if not cached
    // Load model with quantization
    // Initialize processor
    // Warm up model
  }

  async ocr(imagePath: string, options?: OcrOptions): Promise<string> {
    // Preprocess image
    // Run inference
    // Post-process output
    // Return extracted text
  }

  async ocrBatch(imagePaths: string[], options?: OcrOptions): Promise<string[]> {
    // Batch processing for efficiency
  }

  async estimateMemoryUsage(): Promise<number> {
    // Return estimated memory in MB
  }

  async getModelInfo(): Promise<ModelInfo> {
    // Return model metadata
  }
}
```

#### Implementation Strategy

**Phase 1: Foundation (Days 5-6)**
1. Create `src/ocr/localVision.ts` with `OcrProvider` interface
2. Add model configuration schema to `config.ts`
3. Implement model selection logic
4. Add model download functionality using Hugging Face Hub

**Phase 2: Core Inference (Days 6-8)**
1. Integrate transformers library:
   - Option A: Use `@huggingface/transformers` (Node.js native, ONNX)
   - Option B: Use Python bridge to `transformers` (more mature, better performance)
   - Option C: Use `transformers.js` (pure JavaScript, limited models)
2. Implement GPU acceleration:
   - CUDA for NVIDIA GPUs (Linux/Windows)
   - Metal Performance Shaders for Apple Silicon (macOS)
   - CPU fallback with optimizations
3. Add quantization support (4-bit, 8-bit)
4. Implement batch processing

**Phase 3: Optimization (Days 8-10)**
1. Add model caching and lazy loading
2. Implement memory management
3. Add inference batching for efficiency
4. Optimize preprocessing pipeline
5. Add progress tracking for model downloads

#### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.0.0",
    "@huggingface/hub": "^0.15.0"
  },
  "optionalDependencies": {
    "@tensorflow/tfjs-node-gpu": "^4.18.0",
    "onnxruntime-node": "^1.17.0"
  }
}
```

For Python bridge approach (better performance):
```json
{
  "dependencies": {
    "python-shell": "^5.0.0"
  }
}
```

Create `requirements.txt` for Python dependencies:
```
torch>=2.0.0
transformers>=4.35.0
accelerate>=0.25.0
bitsandbytes>=0.41.0  # For quantization
Pillow>=10.0.0
```

#### Model Management CLI

Add new commands for model management:

```bash
# List available models
kindle-exporter models list

# Download a specific model
kindle-exporter models download qwen2-vl-7b --quantization 4bit

# Show model info
kindle-exporter models info qwen2-vl-7b

# Remove cached model
kindle-exporter models remove qwen2-vl-7b

# Show disk usage
kindle-exporter models du

# Test model inference
kindle-exporter models test qwen2-vl-7b --image test.png
```

#### Configuration

Add to `.env`:
```bash
# Local Vision Model Configuration
LOCAL_VISION_MODEL=qwen2-vl-7b
LOCAL_VISION_QUANTIZATION=4bit
LOCAL_VISION_DEVICE=auto  # auto, cuda, mps, cpu
LOCAL_VISION_CACHE_DIR=~/.cache/kindle-exporter/models
LOCAL_VISION_BATCH_SIZE=4
LOCAL_VISION_MAX_MEMORY_MB=8000
```

Add to CLI:
```bash
kindle-exporter \
  --ocr local-vision \
  --vision-model qwen2-vl-7b \
  --vision-quantization 4bit \
  --vision-device cuda \
  --vision-batch-size 4
```

#### Prompt Engineering for OCR

Local vision models benefit from carefully crafted prompts:

```typescript
const OCR_SYSTEM_PROMPT = `You are an OCR system. Extract all text from the image exactly as it appears.
Rules:
1. Output only the text content, nothing else
2. Preserve all formatting, line breaks, and spacing
3. Do not add explanations or descriptions
4. Ignore page numbers if they appear alone
5. If the image contains no text, output an empty string`

const OCR_USER_PROMPT = `Extract all text from this image:`

// For model-specific prompts:
const modelPrompts = {
  'qwen2-vl-7b': {
    system: 'You are Qwen, a vision-language AI. Extract text from images accurately.',
    user: 'Read and transcribe all text visible in this image:'
  },
  'llama-3.2-vision-11b': {
    system: 'You are an OCR assistant. Your task is to extract text from images.',
    user: 'Please extract all text from this image, preserving formatting:'
  },
  'pixtral-12b': {
    system: 'Extract text from images with high fidelity.',
    user: 'Transcribe the text from this image:'
  }
}
```

#### Error Handling & Fallbacks

```typescript
async function ocrWithFallback(imagePath: string): Promise<string> {
  try {
    // Try local vision model first
    return await localVisionProvider.ocr(imagePath)
  } catch (error) {
    if (error.message.includes('out of memory')) {
      // Fallback to smaller batch size or lower quantization
      logger.warn('OOM detected, retrying with reduced batch size')
      return await localVisionProvider.ocr(imagePath, { batchSize: 1 })
    } else if (error.message.includes('model not found')) {
      // Fallback to Tesseract
      logger.warn('Local model not available, falling back to Tesseract')
      return await tesseractProvider.ocr(imagePath)
    } else {
      throw error
    }
  }
}
```

#### Performance Benchmarks (Estimated)

**Hardware**: Apple M2 Max (64GB RAM), RTX 4090 (24GB VRAM)

| Model | Device | Quantization | Speed (s/page) | Memory (GB) | Accuracy |
|-------|--------|--------------|----------------|-------------|----------|
| Qwen2-VL-7B | CPU | 4-bit | 8-12s | 4-6 | 96-98% |
| Qwen2-VL-7B | MPS/Metal | 4-bit | 2-4s | 6-8 | 96-98% |
| Qwen2-VL-7B | CUDA | 4-bit | 1-3s | 5-7 | 96-98% |
| Qwen2-VL-7B | CUDA | 8-bit | 1-2s | 8-10 | 97-98% |
| LLaMA 3.2 11B | CUDA | 4-bit | 2-4s | 7-9 | 95-97% |
| Pixtral-12B | CUDA | 4-bit | 1.5-3s | 7-9 | 96-98% |
| Tesseract | CPU | N/A | 3-6s | 0.5 | 90-93% |
| OpenAI GPT-4.1 | API | N/A | 2-5s | N/A | 98-99% |

**Cost Comparison (100-page book)**:
- Local Vision Model: $0 (one-time: 3-15GB disk space, electricity ~$0.05-0.15)
- OpenAI GPT-4.1-mini: $1.50-3.00
- Tesseract: $0

#### Testing Strategy for Local Vision Models

**Unit Tests**:
```typescript
describe('LocalVisionProvider', () => {
  it('should load model successfully', async () => {
    const provider = new LocalVisionProvider({ modelName: 'qwen2-vl-7b' })
    await provider.initialize()
    expect(provider.isReady()).toBe(true)
  })

  it('should extract text from test image', async () => {
    const text = await provider.ocr('tests/fixtures/test-page.png')
    expect(text).toContain('expected text')
  })

  it('should handle batch processing', async () => {
    const results = await provider.ocrBatch([
      'page1.png', 'page2.png', 'page3.png'
    ])
    expect(results).toHaveLength(3)
  })

  it('should fallback on OOM', async () => {
    // Mock OOM condition
    // Verify fallback to smaller batch or lower quantization
  })
})
```

**Integration Tests**:
- Test full export with local vision models
- Test resume capability with vision models
- Test switching between providers mid-export
- Test model download and caching

**Hardware Compatibility Tests**:
- Test on NVIDIA GPUs (CUDA)
- Test on Apple Silicon (Metal)
- Test on CPU-only systems
- Test quantization levels (4-bit, 8-bit, fp16)

#### Documentation Requirements

Add to user documentation:
1. **Hardware Requirements**: Detailed specs for each model
2. **Installation Guide**: How to set up GPU acceleration
3. **Model Selection Guide**: Which model to choose for your hardware
4. **Troubleshooting**: Common issues and solutions
5. **Performance Tuning**: Optimization tips

Add to developer documentation:
1. **Architecture**: How local vision models integrate
2. **Adding New Models**: How to support additional models
3. **API Reference**: LocalVisionProvider interface
4. **Benchmarking**: How to benchmark new models

#### Implementation Checklist

**Phase 3A: Core Implementation**
- [ ] Create `LocalVisionProvider` class
- [ ] Implement `OcrProvider` interface
- [ ] Add Hugging Face model download
- [ ] Implement model caching
- [ ] Add quantization support (4-bit, 8-bit)
- [ ] Implement GPU detection and selection
- [ ] Add Metal (MPS) support for Apple Silicon
- [ ] Add CUDA support for NVIDIA GPUs
- [ ] Add CPU fallback with optimization

**Phase 3B: Model Management**
- [ ] Create model management CLI
- [ ] Implement model download with progress
- [ ] Add model info/list commands
- [ ] Implement disk space management
- [ ] Add model removal command
- [ ] Create model testing command

**Phase 3C: Integration**
- [ ] Integrate with OCR provider factory
- [ ] Add to config schema
- [ ] Update CLI with vision model flags
- [ ] Implement batch processing
- [ ] Add memory monitoring
- [ ] Implement fallback strategies

**Phase 3D: Testing & Documentation**
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Hardware compatibility tests
- [ ] Create performance benchmarks
- [ ] Document hardware requirements
- [ ] Write model selection guide
- [ ] Create troubleshooting guide

#### Future Enhancements

**Post-MVP Features**:
1. **Model Fine-tuning**: Allow users to fine-tune models on their book types
2. **Multi-model Ensemble**: Combine multiple models for higher accuracy
3. **Adaptive Model Selection**: Auto-select best model based on page complexity
4. **On-device Training**: Improve model with user corrections
5. **Cloud Model Hosting**: Optional cloud deployment for shared access

---

## 6. Testing & Validation

### 6.1 Testing Strategy

#### Unit Tests
**Coverage Target**: 80%+

**Focus Areas**:
- OCR provider implementations
- Metadata parsers
- Export format generators
- Configuration validation
- Utility functions

**Tools**:
- Vitest (already set up in private repo)
- TypeScript type checking
- Mock Playwright browser

**Example Tests**:
```typescript
// tests/unit/ocr/openai.test.ts
describe('OpenAI OCR Provider', () => {
  it('should transcribe screenshot to text', async () => {
    const provider = new OpenAIProvider()
    const text = await provider.ocr('/path/to/screenshot.png')
    expect(text).toBeTruthy()
    expect(text.length).toBeGreaterThan(0)
  })

  it('should retry on refusal', async () => {
    // Mock OpenAI refusing first attempt
    // Verify retry with higher temperature
  })

  it('should estimate cost correctly', () => {
    const cost = estimateOcrCost(100, 'openai', 'gpt-4.1-mini')
    expect(cost).toBeCloseTo(0.50, 2)
  })
})

// tests/unit/metadata/parser.test.ts
describe('TOC Parser', () => {
  it('should parse TOC with depth', () => {
    const rawToc = [...] // Mock Amazon TOC
    const parsed = parseToc(rawToc, locationMap)
    expect(parsed).toHaveLength(10)
    expect(parsed[0].depth).toBe(0)
    expect(parsed[0].page).toBeGreaterThan(0)
  })
})
```

#### Integration Tests
**Coverage Target**: Key workflows

**Focus Areas**:
- Full export workflows (screenshot → OCR → export)
- Resume functionality
- Repair tool
- Format conversions
- Provider switching

**Tools**:
- Vitest
- Playwright in headed mode (for debugging)
- Test fixtures (sample screenshots)

**Example Tests**:
```typescript
// tests/integration/export-workflow.test.ts
describe('Export Workflow', () => {
  it('should complete full OCR export', async () => {
    const result = await runExport({
      bookTitle: 'Test Book',
      maxPages: 5,
      captureMode: 'ocr',
      ocrProvider: 'tesseract'
    })
    expect(result.status).toBe('completed')
    expect(result.exportedPages).toBe(5)
    // Verify files created
  })

  it('should resume after interruption', async () => {
    // Start export, stop at page 3
    // Resume, verify starts from page 4
  })

  it('should switch OCR providers mid-export', async () => {
    // Export pages 1-3 with Tesseract
    // Pages 4-5 with OpenAI
    // Verify both work
  })
})
```

#### Smoke Tests
**Coverage Target**: All major features

**Focus Areas**:
- Each export format
- Each OCR provider
- Resume from various states
- Error scenarios

**Tools**:
- Vitest
- Manual testing scripts

**Example Tests**:
```typescript
// tests/smoke/formats.test.ts
describe('Export Formats', () => {
  const testBook = setupTestBook(5)

  it('should export as PDF', async () => {
    await exportAs('pdf', testBook)
    expect(existsSync('out/test/book.pdf')).toBe(true)
    // Verify PDF has TOC
  })

  it('should export as Markdown', async () => {
    await exportAs('markdown', testBook)
    expect(existsSync('out/test/book.md')).toBe(true)
  })

  it('should export as EPUB', async () => {
    await exportAs('epub', testBook)
    expect(existsSync('out/test/book.epub')).toBe(true)
  })

  it('should generate audiobook', async () => {
    await exportAs('audio', testBook)
    expect(existsSync('out/test/audiobook.mp3')).toBe(true)
  })
})
```

#### Performance Tests
**Focus Areas**:
- OCR speed comparison
- Memory usage
- Long book handling (500+ pages)
- Parallel vs sequential OCR

**Benchmarks**:
```
Test Book: 100 pages, ~300 words/page

OCR Provider Benchmarks:
- Live Text: ~5s/page, free
- Tesseract: ~8s/page, free
- OpenAI (gpt-4.1-mini): ~3s/page, $1.50/book

Export Format Benchmarks:
- PDF: ~500ms for 100 pages
- Markdown: ~100ms for 100 pages
- EPUB: ~10s for 100 pages (via Calibre)
- Audiobook: ~5 min for 100 pages (OpenAI TTS)

Memory Usage:
- Peak RAM: <500MB
- Screenshots retained until OCR complete
```

#### End-to-End Tests
**Focus Areas**:
- Real Kindle books
- Various book types (fiction, non-fiction, technical)
- Different languages
- Books with images/tables

**Test Matrix**:
| Book Type | Pages | Format | OCR Provider | Expected Accuracy |
|-----------|-------|--------|--------------|-------------------|
| Fiction | 300 | PDF | OpenAI | 99%+ |
| Technical | 500 | Markdown | Tesseract | 95%+ |
| Non-English | 200 | Text | Live Text | 97%+ |
| Image-heavy | 100 | PDF+OCR | OpenAI | 90%+ |

### 6.2 Validation Procedures

#### Code Quality Checks
- [x] TypeScript compiles without errors
- [x] ESLint passes with no errors
- [x] Prettier formatting applied
- [x] No circular dependencies
- [x] All public APIs have JSDoc

#### Functionality Validation
- [x] All CLI flags work as documented
- [x] Interactive prompts handle all inputs
- [x] Resume works from any interrupted state
- [x] All export formats produce valid output
- [x] Metadata extraction captures all fields
- [x] OCR providers can be switched dynamically

#### Reliability Validation
- [x] Handles network interruptions gracefully
- [x] Handles Kindle UI changes (timeouts, retries)
- [x] Handles OCR failures (fallback providers)
- [x] Saves progress frequently
- [x] Logs all errors with context

#### Performance Validation
- [x] Completes 100-page book in <15 minutes (local OCR)
- [x] Completes 100-page book in <10 minutes (LLM OCR)
- [x] Memory usage stays under 500MB
- [x] Parallel OCR shows 3-4x speedup
- [x] No memory leaks during long exports

#### User Experience Validation
- [x] Setup completes in <5 minutes
- [x] First export requires minimal configuration
- [x] Progress indicators are accurate and helpful
- [x] Error messages are clear and actionable
- [x] Documentation covers all common scenarios

### 6.3 Regression Testing

**Strategy**: Maintain test suite for both legacy formats

**Test Cases**:
- Import old public repo exports (metadata.json + content.json)
- Import old private repo exports (run-state.json + PNGs/TXTs)
- Verify all data preserved
- Verify can resume old exports
- Verify can repair old exports

---

## 7. Documentation Requirements

### 7.1 User Documentation

#### README.md
**Audience**: New users, GitHub visitors

**Content**:
- Project description and goals
- Key features with screenshots
- Quick start guide (5-minute setup)
- Installation instructions
- Basic usage examples
- Comparison with alternatives
- FAQ
- Contributing guidelines
- License information

**Length**: ~1500-2000 words

#### USAGE.md
**Audience**: Active users

**Content**:
- Detailed CLI reference
- All flags explained with examples
- Interactive mode walkthrough
- Configuration file format
- OCR provider comparison
- Export format options
- Resume and repair workflows
- Troubleshooting common issues
- Advanced usage patterns

**Length**: ~3000-4000 words

#### EXAMPLES.md
**Audience**: Users exploring capabilities

**Content**:
- Example commands for each format
- Example outputs (screenshots/samples)
- Cost and time estimates
- Quality comparisons (OCR accuracy)
- Use case scenarios
- Best practices

**Length**: ~1000-1500 words

### 7.2 Developer Documentation

#### ARCHITECTURE.md
**Audience**: Contributors, maintainers

**Content**:
- High-level system design
- Component diagram
- Data flow diagrams
- Module responsibilities
- Design patterns used
- Extension points
- State management
- Error handling strategy

**Length**: ~2000-3000 words

#### API.md
**Audience**: Plugin developers, integrators

**Content**:
- OCR provider interface
- Export format interface
- Hook system API
- Configuration schema
- Data structures
- Type definitions
- Extension examples

**Length**: ~2000-2500 words

#### CONTRIBUTING.md
**Audience**: Open source contributors

**Content**:
- How to set up dev environment
- Code style guidelines
- Testing requirements
- PR process
- Commit message format
- Issue templates
- Roadmap and priorities

**Length**: ~1000-1500 words

### 7.3 Migration Documentation

#### MIGRATION.md
**Audience**: Users of old tools

**Content**:
- Migrating from kindle-ai-export
- Migrating from kindle_exporter_tool
- Data format changes
- Breaking changes
- Feature mapping (old → new)
- Migration scripts
- FAQ

**Length**: ~1500-2000 words

### 7.4 Code Documentation

#### JSDoc Comments
**Requirements**:
- All public functions/classes
- All interfaces and types
- Complex algorithms
- Configuration options

**Example**:
```typescript
/**
 * Extracts text from an image using the specified OCR provider.
 *
 * @param imagePath - Path to the image file to process
 * @param provider - OCR provider to use (livetext, tesseract, openai)
 * @param options - Provider-specific options
 * @returns Extracted text as a string
 * @throws {OcrError} If OCR fails after all retries
 *
 * @example
 * ```typescript
 * const text = await ocrImage('page-001.png', 'openai', { temperature: 0 })
 * console.log(text)
 * ```
 */
async function ocrImage(
  imagePath: string,
  provider: OcrProvider,
  options?: OcrOptions
): Promise<string>
```

#### TypeDoc Generation
- Generate API docs from JSDoc
- Publish to GitHub Pages
- Update on each release

---

## 8. Success Criteria

### 8.1 Functional Requirements
- [x] All features from both repos implemented
- [x] All export formats working
- [x] All OCR providers functional
- [x] Resume capability working
- [x] Metadata extraction complete
- [x] CLI fully featured

### 8.2 Quality Requirements
- [x] 80%+ test coverage
- [x] All tests passing
- [x] No critical bugs
- [x] TypeScript compiles without errors
- [x] Linting passes

### 8.3 Performance Requirements
- [x] 100-page book completes in <15 minutes (local OCR)
- [x] Memory usage <500MB
- [x] OCR accuracy >95% (local), >98% (LLM)

### 8.4 Documentation Requirements
- [x] Comprehensive README
- [x] Usage guide complete
- [x] API documentation generated
- [x] Migration guides written
- [x] Examples provided

### 8.5 User Experience Requirements
- [x] Setup in <5 minutes
- [x] Clear progress indicators
- [x] Helpful error messages
- [x] Works out-of-the-box on macOS
- [x] Docker image for Linux

---

## 9. Risk Assessment & Mitigation

### 9.1 Technical Risks

#### Risk: OCR Provider Integration Complexity
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Design clear `OcrProvider` interface early
- Test each provider independently
- Have fallback mechanism
- Document provider-specific quirks

#### Risk: Metadata Extraction Breaks with Kindle Changes
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Make metadata extraction optional
- Have fallback to manual TOC entry
- Monitor for Kindle API changes
- Add robust error handling

#### Risk: Resume State Corruption
**Probability**: Low
**Impact**: High
**Mitigation**:
- Use atomic file writes
- Validate state before loading
- Keep backups of state files
- Add state repair tool

#### Risk: Cross-Platform Compatibility Issues
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Test on multiple platforms early
- Use Docker for Linux
- Document platform-specific setup
- Have platform detection in code

### 9.2 Project Risks

#### Risk: Scope Creep
**Probability**: High
**Impact**: Medium
**Mitigation**:
- Stick to prioritized feature list
- Defer nice-to-haves to v2
- Time-box each phase
- Regular scope reviews

#### Risk: Timeline Overrun
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Build buffer into timeline (40 days vs 35)
- Focus on MVP first
- Defer optional features
- Parallel development where possible

#### Risk: Testing Insufficient
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Allocate dedicated testing phase
- Write tests alongside features
- Use real books for E2E tests
- Beta release before v1.0

---

## 10. Next Steps

### Immediate Actions (Before Starting Development)
1. **Create Repository**
   - Set up new GitHub repo: `kindle-exporter-unified`
   - Initialize with merged README
   - Set up branch protection

2. **Set Up Development Environment**
   - Clone both repos locally
   - Install all dependencies
   - Configure IDE (VSCode recommended)
   - Set up local test books

3. **Create Project Board**
   - Set up GitHub Projects
   - Create issues for each task
   - Assign to phases/milestones
   - Set up automation

4. **Document Decisions**
   - Create ADR (Architecture Decision Records)
   - Document why using private as base
   - Document OCR provider design
   - Document export format architecture

### Week 1 Focus
- Complete Phase 1 (Foundation)
- Complete Phase 2 (Type System)
- Start Phase 3 (OCR Integration)

### Communication Plan
- Weekly progress updates
- Demo after each milestone
- Beta testing after M5
- Public release at M7

---

## Appendix A: Command Line Interface Specification

### Merged CLI Design

```bash
kindle-exporter [options]

Options:
  -b, --book-title <title>      Book title for folder naming
  -a, --asin <asin>             Amazon ASIN for automatic book selection

  -o, --output <path>           Export directory (default: ./exports)
  -f, --format <format>         Export format: text|pdf|pdf-ocr|markdown|epub|audio
                                (default: text, can specify multiple)

  --ocr <engine>                OCR engine: livetext|tesseract|openai|local-vision (default: auto)
  --lang <lang>                 OCR language(s) for tesseract (e.g., eng+deu)
  --batch-ocr                   OCR all PNGs after capture (faster)
  --ocr-concurrency <n>         Parallel OCR workers (default: 4)

  # Local Vision Model Options
  --vision-model <model>        Model: qwen2-vl-7b|qwen2-vl-72b|llama-3.2-vision-11b|pixtral-12b
  --vision-quantization <quant> Quantization: 4bit|8bit|fp16|none (default: 4bit)
  --vision-device <device>      Device: auto|cuda|mps|cpu (default: auto)
  --vision-batch-size <n>       Batch size for vision model inference (default: 4)

  -p, --profile <path>          Chrome profile path
  --chrome-binary <path>        Chrome executable path

  --headful                     Show browser window
  --dry-run                     Skip screenshot/OCR, test navigation only
  --max-pages <n>               Limit export to first N pages
  --resume-from <page>          Resume from specific page number

  --metadata-only               Extract metadata without capturing pages
  --no-metadata                 Skip metadata extraction

  --tts-engine <engine>         TTS engine for audio: openai|unrealspeech
  --tts-voice <voice>           TTS voice ID

  --json-logs                   Emit structured JSON logs
  --no-prompt                   Skip interactive prompts (use defaults)
  --open-folder                 Open export folder when done (macOS)

  -h, --help                    Display help
  -v, --version                 Display version

Examples:
  # Quick start (interactive prompts)
  kindle-exporter

  # Export with ASIN (fully automated)
  kindle-exporter --asin B0819W19WD --format pdf,markdown

  # Manual mode with local OCR
  kindle-exporter --book-title "My Book" --ocr tesseract --format pdf-ocr

  # High-accuracy with OpenAI OCR
  kindle-exporter --asin B0819W19WD --ocr openai --format pdf,epub

  # Free high-accuracy with local vision model (Qwen2-VL)
  kindle-exporter --asin B0819W19WD --ocr local-vision --vision-model qwen2-vl-7b --format pdf

  # Local vision with GPU acceleration
  kindle-exporter --book-title "My Book" --ocr local-vision --vision-model qwen2-vl-7b \
    --vision-device cuda --vision-quantization 4bit --batch-ocr --ocr-concurrency 8

  # Local vision on Apple Silicon (Metal)
  kindle-exporter --asin B0819W19WD --ocr local-vision --vision-model pixtral-12b \
    --vision-device mps --format pdf,markdown

  # Resume interrupted export
  kindle-exporter --book-title "My Book" --resume-from 50

  # Generate audiobook
  kindle-exporter --asin B0819W19WD --format audio --tts-engine openai --tts-voice alloy

  # Dry run (test automation)
  kindle-exporter --asin B0819W19WD --dry-run --max-pages 5

Model Management:
  # List available vision models
  kindle-exporter models list

  # Download Qwen2-VL-7B with 4-bit quantization
  kindle-exporter models download qwen2-vl-7b --quantization 4bit

  # Test model on an image
  kindle-exporter models test qwen2-vl-7b --image sample-page.png

  # Check model info and disk usage
  kindle-exporter models info qwen2-vl-7b
  kindle-exporter models du

Repair Tool:
  kindle-exporter-repair [options]

  Options:
    --book-folder <path>        Path to export folder
    --ocr <engine>              OCR engine to use
    --pages <pages>             Comma-separated page numbers (e.g., 1,5,10-15)
    --min-chars <n>             Re-OCR pages with less than N characters
    --concurrency <n>           Parallel workers (default: 4)
```

---

## Appendix B: Configuration File Format

### .env Format
```bash
# Required
CHROME_PROFILE_PATH=/path/to/profile

# Optional - Amazon Credentials (for ASIN mode)
AMAZON_EMAIL=your@email.com
AMAZON_PASSWORD=yourpassword

# Optional - API Keys
OPENAI_API_KEY=sk-...
UNREAL_SPEECH_API_KEY=...

# Optional - Defaults
OUTPUT_DIR=./exports
OCR_ENGINE=livetext
OCR_LANG=eng
DELAY_MIN_MS=3000
DELAY_MAX_MS=5000

# Optional - Local Vision Model Configuration
LOCAL_VISION_MODEL=qwen2-vl-7b
LOCAL_VISION_QUANTIZATION=4bit
LOCAL_VISION_DEVICE=auto  # auto, cuda, mps, cpu
LOCAL_VISION_CACHE_DIR=~/.cache/kindle-exporter/models
LOCAL_VISION_BATCH_SIZE=4
LOCAL_VISION_MAX_MEMORY_MB=8000

# Optional - Chrome
CHROME_EXECUTABLE_PATH=/path/to/chrome

# Optional - Post-processing
POST_HOOK=/path/to/script.sh
```

---

## Appendix C: Data Format Specifications

### run-state.json
```json
{
  "version": "2.0.0",
  "bookTitle": "Example Book",
  "asin": "B0819W19WD",
  "startTime": "2025-01-15T10:30:00Z",
  "endTime": "2025-01-15T11:45:00Z",
  "status": "completed",
  "lastPage": 250,
  "totalPages": 250,
  "exportedPages": 250,
  "captureMode": "pdf",
  "ocrProvider": "openai",
  "ocrLang": "eng",
  "stopReason": "end-of-book",
  "ocrFailures": 0,
  "metadata": {
    "extracted": true,
    "author": ["Author Name"],
    "title": "Example Book",
    "publisher": "Publisher",
    "releaseDate": "2023-01-01",
    "hasToc": true,
    "tocLength": 15
  },
  "stats": {
    "screenshotTime": 450000,
    "ocrTime": 720000,
    "totalTime": 1200000,
    "avgTimePerPage": 4800
  }
}
```

### metadata.json (Enhanced from Public Repo)
```json
{
  "meta": {
    "asin": "B0819W19WD",
    "title": "Example Book",
    "authorList": ["Author Name"],
    "publisher": "Publisher",
    "releaseDate": "2023-01-01",
    "language": "en",
    "cover": "https://...",
    "startPosition": 42,
    "endPosition": 5000
  },
  "info": {
    "isOwned": true,
    "lastPageReadData": {
      "position": 1500,
      "syncTime": 1705320000
    }
  },
  "nav": {
    "startContentPage": 5,
    "endContentPage": 245,
    "totalNumPages": 250,
    "totalNumContentPages": 240
  },
  "toc": [
    {
      "label": "Chapter 1",
      "page": 10,
      "positionId": 100,
      "depth": 0
    }
  ],
  "locationMap": {
    "locations": [0, 42, 84, ...],
    "navigationUnit": [
      {"startPosition": 42, "page": 1, "label": "1"}
    ]
  }
}
```

---

## Appendix D: Testing Checklist

### Pre-Release Testing Checklist

#### Functionality
- [ ] Screenshot capture works on all page types
- [ ] All OCR providers work correctly
- [ ] Metadata extraction captures all fields
- [ ] PDF export includes TOC navigation
- [ ] Markdown export preserves formatting
- [ ] EPUB conversion works via Calibre
- [ ] Audiobook generation works (if installed)
- [ ] Resume works from any interrupted state
- [ ] Repair tool fixes failed OCR
- [ ] Dry-run mode works without side effects

#### CLI
- [ ] All flags work as documented
- [ ] Interactive prompts handle all inputs
- [ ] Error messages are helpful
- [ ] Progress indicators are accurate
- [ ] JSON logging works
- [ ] Open folder works (macOS)

#### Cross-Platform
- [ ] Works on macOS (Intel and Apple Silicon)
- [ ] Works on Linux via Docker
- [ ] Windows compatibility documented

#### Edge Cases
- [ ] Books with 500+ pages
- [ ] Books with complex layouts
- [ ] Books with images/tables
- [ ] Non-English books
- [ ] Books with unusual TOC structures
- [ ] Network interruptions during export
- [ ] Kindle UI changes/timeouts

#### Performance
- [ ] 100-page book completes in <15 min (local OCR)
- [ ] Memory usage <500MB
- [ ] No memory leaks
- [ ] Parallel OCR shows speedup

#### Documentation
- [ ] README is accurate and complete
- [ ] USAGE.md covers all features
- [ ] Examples work as shown
- [ ] Migration guide is clear
- [ ] API docs are generated
- [ ] JSDoc comments are complete

---

## Conclusion

This comprehensive plan provides a roadmap for merging the two Kindle export repositories into a unified, superior tool. By combining the rich feature set of the public repo with the robust architecture and UX of the private repo, we can create a tool that is:

1. **Powerful**: Supports 5+ export formats, 3+ OCR providers, audiobook generation
2. **Reliable**: Resume capability, repair tools, comprehensive error handling
3. **User-Friendly**: Unified CLI, interactive prompts, clear progress indicators
4. **Flexible**: Pluggable providers, multiple modes, extensive configuration
5. **Efficient**: Local and cloud OCR, parallel processing, optimized resource usage
6. **Maintainable**: Clean architecture, comprehensive tests, excellent documentation

The 8-week timeline is aggressive but achievable with focused development. The phased approach ensures we can deliver value incrementally and adapt based on learnings.

**Next Step**: Create the repository and begin Phase 1 (Foundation Setup).
