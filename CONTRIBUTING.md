# Contributing to Kindle Exporter

Thank you for your interest in contributing! This project is currently in active development (pre-v0.1.0).

## Development Status

**Current Phase**: Foundation Setup (Phase 1 of 10)

The project is following a comprehensive [merge plan](docs/MERGE_PLAN.md) that outlines an 8-week development roadmap. We're currently setting up the foundation and will be ready for external contributions after the v0.1.0 release.

## Getting Started (For Future Contributors)

### Prerequisites
- Node.js >= 20
- pnpm >= 10
- Git
- macOS 13+ (for Live Text OCR) or Linux with Docker

### Setup
```bash
# Clone the repository
git clone https://github.com/jrichyrich/kindle-exporter.git
cd kindle-exporter

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run setup script
pnpm setup

# Run preflight checks
pnpm preflight

# Run in development mode
pnpm dev
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:smoke

# Run tests in watch mode
pnpm test:watch
```

## Development Workflow (Coming Soon)

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Ensure all tests pass (`pnpm test`)
6. Ensure linting passes (`pnpm lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to your fork (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** strict mode
- **Conventional Commits** for commit messages

Run `pnpm lint:fix` and `pnpm format` before committing.

## Testing Guidelines

- Write unit tests for all new functionality
- Integration tests for workflows
- Smoke tests for critical paths
- Aim for >80% code coverage

## Architecture Overview

See [docs/MERGE_PLAN.md](docs/MERGE_PLAN.md) for detailed architecture.

Key principles:
- **Plugin Architecture**: OCR providers, export formats are pluggable
- **Type Safety**: Strict TypeScript throughout
- **Error Handling**: Graceful degradation and helpful error messages
- **Resumability**: All long-running operations support resume
- **Observability**: Structured logging for debugging

## Adding New Features

### Adding a New OCR Provider
1. Create provider class in `src/ocr/`
2. Implement `OcrProvider` interface
3. Add to provider factory in `src/ocr/index.ts`
4. Add configuration options
5. Write tests
6. Update documentation

### Adding a New Export Format
1. Create exporter in `src/exporters/`
2. Implement export interface
3. Add format to CLI options
4. Write tests
5. Add examples
6. Update documentation

## Project Structure

```
kindle-exporter/
├── src/
│   ├── automation/      # Browser automation
│   ├── ocr/            # OCR providers
│   ├── metadata/       # Metadata extraction
│   ├── exporters/      # Format exporters
│   ├── utils/          # Shared utilities
│   └── tools/          # CLI tools
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── smoke/          # Smoke tests
├── docs/               # Documentation
└── scripts/            # Build/setup scripts
```

## Reporting Issues

Please use GitHub Issues for:
- Bug reports
- Feature requests
- Documentation improvements
- Questions about usage

**For bugs**, include:
- Your OS and Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs (use `--json-logs` flag)

## Feature Requests

Feature requests are welcome! Please:
- Check existing issues first
- Describe the use case
- Explain how it fits the project goals
- Consider implementation complexity

## Documentation

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add examples
- Improve API documentation
- Write tutorials

## Questions?

- Check the [merge plan](docs/MERGE_PLAN.md)
- Read existing issues
- Open a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Status**: Pre-v0.1.0 - Project in active development
**Timeline**: Following 8-week merge plan (see docs/MERGE_PLAN.md)
**Next Milestone**: v0.1.0 (Foundation Complete)
