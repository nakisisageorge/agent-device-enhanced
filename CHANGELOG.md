# Changelog

All notable changes to this project will be documented in this format.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-13

### Added - New Enhancement Packages
- **@agent-device/ai-selector**: AI-powered resilient selector generation
  - LLM-assisted selector generation (OpenAI, Anthropic, Groq, Google)
  - Multiple strategies: TestId, AccessibilityLabel, RoleIndex, XPathLike, Composite
  - Confidence scoring with fallback chains
  - CLI command: `agent-device suggest-selector`
  - MCP tool: `suggest_selector`
  - Node.js API: `client.ai.suggestSelector()`

- **@agent-device/screen-recording-ai**: AI-enhanced screen recording analysis
  - Automatic highlight detection (errors, crashes, network failures, UI changes, performance drops)
  - Structured evidence extraction (network logs, console logs, performance metrics, snapshots)
  - `.ad` replay script generation from recordings
  - CLI: `agent-device screen-record --ai-highlights --extract-evidence --generate-replay`
  - MCP streaming progress support

- **@agent-device/security-patterns**: Mobile app security automation
  - Credential leakage detection (40+ patterns)
  - PII scanning (email, phone, SSN, credit cards, medical, crypto)
  - Insecure storage audit (SharedPreferences, Keychain, AsyncStorage, SQLite, Realm)
  - Certificate pinning verification (config extraction + MITM testing)
  - Network security scanning (cleartext HTTP, weak TLS)
  - CLI: `agent-device security-scan`
  - MCP tool: `security_scan`

### Added - Core Enhancements
- **Streaming MCP Server**: Progress updates for long operations, rich tool metadata, structured error responses
- **Android Snapshot Optimization**: Caching with smart invalidation, batched geometry calls, React Native sheet fast-path
- **Interactive REPL**: `agent-device repl` for live session exploration and time-travel debugging
- **Interactive Architecture Documentation**: React Flow visualization at `docs/architecture/architecture.html`
- **Enhanced CLI Commands**:
  - `suggest-selector` — AI-powered selector generation
  - `screen-record --ai-highlights` — AI recording analysis
  - `security-scan` — Security vulnerability scanning
  - `repl` — Interactive REPL mode

### Changed - Performance
- Android snapshot acquisition: 2-22s → <2s target (addresses Issue #3558)
- Batched backend geometry measurement (addresses Issue #3533)
- Lazy loading of platform modules
- Connection pooling for device communication

### Changed - Developer Experience
- Rich MCP tool descriptions with examples
- Structured error responses with recovery suggestions
- Session-aware tool routing
- `--dry-run` mode for mutating commands (planned)

### Fixed
- Optional refs in snapshots (addresses Issue #3547)
- Semantic role vocabulary resolution (addresses Issue #3531)
- Daemon command registry completeness

### Security
- All new packages follow secure coding practices
- Credential/PII matches redacted in output
- Validator functions reduce false positives (Luhn check, entropy analysis)
- No hardcoded secrets; all API keys via environment variables
- Audit logging for security scans

### Documentation
- Interactive architecture visualization (React Flow)
- DESIGN_DOCUMENT.md with architecture decisions
- PORTFOLIO_CASE_STUDY.md with before/after comparison
- IMPROVEMENT_PLAN.md with detailed enhancement plan
- Updated README with enhancement documentation

### Attribution
This release is a **substantial enhancement fork** of [callstack/agent-device](https://github.com/callstack/agent-device) v0.21.28.
Original MIT license preserved. All enhancements by George Nakisisa / GICT Africa Technologies.