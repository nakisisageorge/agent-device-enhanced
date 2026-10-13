# PROJECT IMPROVEMENT PLAN
## agent-device-enhanced

### Original Project
**Name:** agent-device
**Repository:** https://github.com/callstack/agent-device
**Technology:** TypeScript, pnpm monorepo, Node.js 22.12+
**Purpose:** Mobile app automation and verification for AI coding agents. CLI, MCP server, and typed Node.js API for iOS, Android, HarmonyOS, TV, web, macOS, and Linux.
**License:** MIT

### Problems Identified
1. **Android Snapshot Performance** (Issue #3558): Snapshots take 2–22 seconds, causing `wait` timeouts while React Native sheets tick once per second
2. **Missing AI-Powered Selector Generation**: Agents struggle with resilient element targeting; no LLM-assisted selector generation from snapshots
3. **MCP Server Limitations**: No streaming/progress support for long-running operations, limited tool descriptions for agent discoverability
4. **Screen Recording Gaps**: No AI-powered highlight detection or automatic evidence extraction from recordings
4. **Documentation Gaps**: No interactive architecture visualization, limited agent-friendly documentation
5. **Developer Experience**: No interactive CLI mode, limited debugging tools for agent workflows
6. **Security Testing Features**: No built-in security-focused automation patterns (credential leakage detection, PII scanning, etc.)

### Proposed Improvements
1. **AI-Powered Selector Assistant** (`packages/ai-selector`)
   - New package that analyzes accessibility snapshots and generates resilient selectors using LLM
   - Supports multiple strategies: test-id, accessibility label, role+index, XPath-like paths
   - Confidence scoring and fallback selector chains
   - CLI command: `agent-device suggest-selector <snapshot-file> --target <description>`

2. **Android Snapshot Performance Optimization**
   - Implement snapshot caching with invalidation
   - Add batched backend calls for geometry measurement (Issue #3533)
   - Optimize React Native sheet dialog handling
   - Target: <2s for typical snapshots

3. **Enhanced MCP Server** (`src/mcp/enhanced-server.ts`)
   - Streaming/progress support for long operations (`wait`, `snapshot`, `screen-record`)
   - Rich tool descriptions with examples for agent discoverability
   - Structured error responses with recovery suggestions
   - Session-aware tool routing

4. **AI-Enhanced Screen Recording** (`packages/screen-recording-ai`)
   - Automatic highlight detection (errors, crashes, UI changes)
   - Evidence extraction: network failures, console errors, performance spikes
   - Generate `.ad` replay scripts from recordings
   - CLI: `agent-device screen-record --ai-highlights --extract-evidence`

5. **Interactive Architecture Documentation** (`docs/architecture/`)
   - React Flow-based interactive architecture tree
   - Expandable nodes: CLI → Daemon → Platform Runtimes → Providers
   - Click-through to source code, API docs, platform specifics
   - Responsive, mobile-friendly, fast

6. **Security Automation Patterns** (`packages/security-patterns`)
   - Credential leakage detection in snapshots/logs
   - PII scanning in accessibility trees
   - Certificate pinning verification
   - Insecure storage detection (SharedPreferences, Keychain, AsyncStorage)
   - CLI: `agent-device security-scan --session <id>`

7. **Developer Experience Improvements**
   - Interactive REPL mode: `agent-device repl`
   - Debug command with time-travel debugging: `agent-device debug <session-id>`
   - Better error messages with actionable fixes
   - `--dry-run` mode for all mutating commands

### New Features
- **AI Selector Assistant** — LLM-powered resilient selector generation
- **Performance Optimized Snapshots** — Sub-2s Android snapshots with caching
- **Enhanced MCP Server** — Streaming, progress, rich tool metadata
- **AI Screen Recording** — Automatic highlights and evidence extraction
- **Interactive Architecture Explorer** — Browser-based architecture visualization
- **Security Scanning** — Mobile app security pattern detection
- **Interactive REPL** — Live agent-device session exploration
- **Time-Travel Debugging** — Replay and inspect session history

### Security Improvements
- Credential/PII detection in snapshots and logs
- Secure defaults for device communication
- Audit logging for all mutating operations
- Supply chain security: dependency scanning, SBOM generation
- No hardcoded secrets; environment variable configuration

### Performance Improvements
- Android snapshot caching with smart invalidation
- Batched backend geometry calls
- Lazy loading of platform modules
- Connection pooling for device communication
- Optimized daemon startup

### Testing Improvements
- Unit tests for AI selector package (vitest)
- Integration tests for MCP streaming
- E2E tests for security scanning
- Performance benchmarks for snapshot acquisition
- Mutation testing for critical paths

### Documentation Improvements
- Interactive architecture visualization (architecture.html)
- DESIGN_DOCUMENT.md with architecture decisions
- PORTFOLIO_CASE_STUDY.md with before/after comparison
- AI Agent Setup guide with examples
- API documentation with runnable examples
- Security scanning guide

### Architecture Improvements
- New `@agent-device/ai-selector` package (independent, testable)
- New `@agent-device/screen-recording-ai` package
- New `@agent-device/security-patterns` package
- Enhanced MCP server with streaming support
- Plugin architecture for custom analysis modules

### Expected Result
A substantially enhanced version of agent-device that:
- Adds AI-powered selector generation for more reliable agent automation
- Fixes critical Android snapshot performance issues
- Provides streaming MCP server for better agent integration
- Includes security scanning for mobile app vulnerability detection
- Offers interactive architecture documentation for onboarding
- Delivers AI-enhanced screen recording with automatic evidence extraction
- Improves developer experience with REPL and debugging tools
- Maintains full backward compatibility with original agent-device
- Demonstrates Senior Software Engineer · AI Engineer · Cybersecurity competencies

### Mode Declaration
**Mode B: Substantial Enhancement Fork**
- Fork the original repository under `nakisisageorge/agent-device-enhanced`
- Implement meaningful improvements as independent packages where possible
- Maintain clear attribution to original Callstack project
- Publish as independent npm package `@gi

ct-africa/agent-device-enhanced`