# Kindle Exporter

> Export any Kindle book you own as text, PDF, EPUB, Markdown, or as a custom AI-narrated audiobook. 🚀

**Status**: 🚧 In Development - See [MERGE_PLAN.md](docs/MERGE_PLAN.md) for roadmap

## Overview

Kindle Exporter is a unified tool that combines the best features from multiple Kindle export projects to create the most comprehensive, reliable, and user-friendly Kindle book exporter available.

### Key Features (Planned)

- 🎯 **Multiple Export Formats**: Text, PDF (with TOC), Searchable PDF, EPUB, Markdown, Audiobook
- 🔄 **Resume Capability**: Pick up where you left off if interrupted
- 🤖 **Flexible OCR Options**:
  - Local: Live Text (macOS), Tesseract (cross-platform)
  - Cloud: OpenAI Vision Models
  - **Local Vision Models**: Qwen2-VL, LLaMA Vision, Pixtral (FREE, high accuracy!)
- 📚 **Rich Metadata**: Full table of contents, chapter boundaries, Kindle sync positions
- 🛠️ **Repair Tools**: Fix failed OCR on specific pages
- 💻 **Unified CLI**: Single command-line interface with interactive prompts
- 🐳 **Cross-Platform**: macOS native, Linux via Docker
- 📊 **Structured Logging**: JSON logs for programmatic processing
- 🎨 **Great UX**: Progress indicators, colored output, helpful error messages

## Quick Start

**Coming Soon** - This project is currently in the planning/implementation phase.

### Current Status

This repository represents the merge of two existing Kindle export tools:
- [kindle-ai-export](https://github.com/transitive-bullshit/kindle-ai-export) - AI-powered, rich features
- [kindle_exporter_tool](https://github.com/jrichyrich/kindle_exporter_tool) - Robust CLI, resume capability

See [docs/MERGE_PLAN.md](docs/MERGE_PLAN.md) for the comprehensive implementation plan.

## Development Roadmap

### Phase 1: Foundation (Days 1-5)
- [x] Project structure setup
- [x] Comprehensive merge plan
- [ ] Initialize TypeScript project
- [ ] Merge dependencies
- [ ] Unified type system

### Phase 2-3: Core OCR (Days 5-10)
- [ ] Integrate all OCR providers (Live Text, Tesseract, OpenAI, Local Vision Models)
- [ ] Implement provider factory pattern
- [ ] Add batch processing

### Phase 4: Metadata (Days 10-14)
- [ ] Extract Amazon metadata
- [ ] Parse table of contents
- [ ] Map Kindle positions to pages

### Phase 5-7: Export & UX (Days 14-28)
- [ ] All export formats
- [ ] Unified CLI
- [ ] Interactive prompts
- [ ] Progress indicators

### Phase 8-10: Polish (Days 28-40)
- [ ] Comprehensive testing
- [ ] Full documentation
- [ ] Release v1.0

**Estimated Timeline**: 8 weeks (40 working days)

**Target Release**: v1.0.0

## Architecture Highlights

```
kindle-exporter/
├── src/
│   ├── automation/          # Browser automation, page navigation
│   ├── ocr/                 # Pluggable OCR providers
│   │   ├── livetext.ts      # macOS Live Text
│   │   ├── tesseract.ts     # Cross-platform Tesseract
│   │   ├── openai.ts        # OpenAI vision models
│   │   └── localVision.ts   # Local vision models (Qwen, LLaMA, Pixtral)
│   ├── metadata/            # Amazon metadata extraction
│   ├── exporters/           # Format exporters (PDF, EPUB, etc.)
│   ├── utils/               # Shared utilities
│   └── tools/               # CLI tools (repair, migrate)
├── docs/                    # Documentation
└── tests/                   # Comprehensive test suite
```

## Why This Project?

Kindle uses proprietary DRM formats that make it difficult to:
- Access your purchased content offline
- Create searchable archives
- Generate custom formats for different use cases
- Build AI-powered reading tools

This project provides a **legal, local, automation-based solution** that respects DRM while enabling personal use of your own content.

## Technology Stack

- **Language**: TypeScript/Node.js (>= 20)
- **Package Manager**: pnpm
- **Browser Automation**: Playwright/Patchright
- **OCR**: Multiple providers (pluggable architecture)
- **Vision Models**: Hugging Face Transformers
- **Testing**: Vitest
- **Format Libraries**: PDFKit, Sharp, FFmpeg

## Contributing

This project is in active development. Contributions welcome after v0.1.0 release.

See [docs/MERGE_PLAN.md](docs/MERGE_PLAN.md) for detailed architecture and implementation plans.

## Disclaimer

**This project is intended purely for personal and educational use only**. It is not endorsed or supported by Amazon / Kindle. By using this project, you agree to:
- Only export books you personally own
- Not share exported content publicly
- Respect copyright and support authors
- Use automation responsibly (human-like pacing, no abuse)

## License

MIT © Jason Richardson

## Acknowledgments

This project builds upon and merges ideas from:
- [kindle-ai-export](https://github.com/transitive-bullshit/kindle-ai-export) by Travis Fischer
- [kindle_exporter_tool](https://github.com/jrichyrich/kindle_exporter_tool) (private repo)

Special thanks to the open source community for the excellent libraries that make this possible.

---

**Current Phase**: Foundation Setup (Phase 1)
**Last Updated**: 2025-01-15
**Status**: 🚧 Pre-Alpha Development
