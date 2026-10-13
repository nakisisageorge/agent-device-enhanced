# DESIGN DOCUMENT
## agent-device-enhanced

### 1. Original Architecture

The original `agent-device` (callstack/agent-device) is a sophisticated mobile app automation framework with the following architecture:

**CLI Layer**
- Entry point: `agent-device` binary (Node.js ESM)
- Commands: `open`, `snapshot`, `press`, `fill`, `wait`, `screenshot`, `close`, `test`, `mcp`, `doctor`, `help`
- MCP Server: stdio-based Model Context Protocol server exposing all commands as tools
- Node.js API: `createAgentDeviceClient()` for programmatic access

**Daemon Core**
- Long-running daemon process owning sessions
- Session management with worktree-scoped isolation
- Device ownership/claims system preventing parallel agent conflicts
- Command registry with runtime-use declarations and request-policy traits
- RPC protocol with version skew handling

**Platform Runtime Gateway**
- Device inventory composition (local + remote providers)
- Runtime fact admission and bound device runtime projection
- Capability-cohesive runtime facets

**Platform Runtimes (Platform Modules)**
- **Apple**: iOS Simulator, Physical iOS, tvOS, macOS via XCTest runner + accessibility bridge
- **Android**: ADB + custom snapshot helper, UIAutomator, React Native support
- **Web**: agent-browser integration via Playwright/CDP
- **Linux**: AT-SPI accessibility dump
- **HarmonyOS**: HDC + ArkUI uitest
- **Vega OS**: Vega CLI/VDA

**Provider Gateway**
- Remote device cloud integration (BrowserStack, AWS Device Farm, Limrun, TestMu AI)
- WebDriver/Appium session mapping
- Lease management and artifact collection

**Core Contracts**
- Cross-language schemas (TypeScript ↔ Swift ↔ Kotlin)
- Interaction guarantees and dispatch path classifications
- Selector parsing/matching with predicate evaluation
- Wire protocols for daemon-client communication

### 2. Problems Identified

From analysis of the codebase and open issues:

1. **Android Snapshot Performance** (Issue #3558): Snapshots take 2–22 seconds, causing `wait` timeouts while React Native sheets tick once per second inside dialog windows.

2. **Missing AI-Powered Selector Generation**: Agents struggle with resilient element targeting; no LLM-assisted selector generation from accessibility snapshots.

3. **MCP Server Limitations**: No streaming/progress support for long-running operations, limited tool descriptions for agent discoverability.

4. **Screen Recording Gaps**: No AI-powered highlight detection or automatic evidence extraction from recordings.

5. **Documentation Gaps**: No interactive architecture visualization, limited agent-friendly documentation.

6. **Developer Experience**: No interactive CLI mode, limited debugging tools for agent workflows.

7. **Security Testing Features**: No built-in security-focused automation patterns (credential leakage detection, PII scanning, certificate pinning verification, insecure storage detection).

### 3. Proposed Architecture

The enhanced architecture adds three new independent packages and enhances existing components:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLI Layer (Enhanced)                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │
│  │ Commands│  │ MCP Srv │  │Node API │  │ REPL    │  │ AI Selector │  │
│  │ (orig)  │  │(enh.)   │  │(orig)   │  │(NEW)    │  │ CLI Cmd     │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘  │
└───────┼────────────┼───────────┼────────────┼───────────┼────────────┘
        │            │           │            │           │
        ▼            ▼           ▼            ▼           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Daemon Core (Enhanced)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Session Mgr  │  │ Device Claims│  │ Cmd Registry │  │ Streaming  │  │
│  │ (orig)       │  │ (orig)       │  │ (orig)       │  │ MCP (NEW)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Platform Runtime Gateway (orig)                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Apple Platform│         │Android Platform│        │ Other Platforms│
│ (optimized)   │         │(perf. enhanced)│        │ (orig)        │
└───────────────┘         └───────────────┘         └───────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Provider Gateway (orig)                            │
└─────────────────────────────────┬───────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    NEW ENHANCEMENT PACKAGES                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ @agent-device/   │  │ @agent-device/   │  │ @agent-device/   │      │
│  │ ai-selector      │  │ screen-recording-│  │ security-patterns│      │
│  │                  │  │ ai               │  │                  │      │
│  │ • LLM selectors  │  │ • Highlight det. │  │ • Credential scan│      │
│  │ • Confidence     │  │ • Evidence extr. │  │ • PII detection  │      │
│  │ • Fallback chain │  │ • Replay gen.    │  │ • Storage audit  │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. New Architecture Components

#### 4.1 @agent-device/ai-selector Package
**Purpose**: AI-powered resilient selector generation from accessibility snapshots.

**Components**:
- `SelectorGenerator`: Main orchestration, candidate finding, chain building
- `Strategies`: TestId, AccessibilityLabel, RoleIndex, XPathLike, Composite, LLMComposite
- `LLMClient`: Vercel AI SDK integration (OpenAI, Anthropic, Groq, Google)
- `Confidence`: Multi-factor confidence scoring

**Integration Points**:
- CLI command: `agent-device suggest-selector <snapshot-file> --target <description>`
- MCP tool: `suggest_selector` with streaming results
- Node.js API: `client.ai.suggestSelector()`

#### 4.2 @agent-device/screen-recording-ai Package
**Purpose**: AI-enhanced screen recording with automatic analysis.

**Components**:
- `AIRecorder`: Session management, video + metadata coordination
- `HighlightDetector`: Frame analysis for errors, crashes, network failures, UI changes, performance drops
- `EvidenceExtractor`: Structured evidence from network logs, console logs, performance metrics, snapshots
- `ReplayGenerator`: Converts highlights + evidence → executable `.ad` scripts

**Integration Points**:
- CLI: `agent-device screen-record --ai-highlights --extract-evidence --generate-replay`
- MCP: Streaming progress updates during recording
- Node.js API: `client.recording.startAI()`, `client.recording.stopAI()`

#### 4.3 @agent-device/security-patterns Package
**Purpose**: Mobile app security automation patterns.

**Components**:
- `CredentialScanner`: 40+ built-in patterns (AWS, GitHub, GCP, Azure, Stripe, JWT, DB URIs, etc.)
- `PIIScanner`: Email, phone, SSN, credit cards, medical records, addresses, crypto addresses
- `StorageAuditor`: Android SharedPreferences, iOS Keychain/UserDefaults, React Native AsyncStorage, SQLite, Realm
- `PinningVerifier`: Certificate pinning config extraction + MITM testing

**Integration Points**:
- CLI: `agent-device security-scan --session <id> --app <bundle-id>`
- MCP: `security_scan` tool with structured findings
- Node.js API: `client.security.scan()`

### 5. Technology Decisions

| Decision | Rationale |
|----------|-----------|
| **Vercel AI SDK for LLM integration** | Unified provider abstraction, streaming, structured outputs, TypeScript-first |
| **Independent packages** | Separation of concerns, independent versioning, optional dependencies, tree-shaking |
| **React Flow for architecture viz** | Interactive, web-standard, no build step required, responsive |
| **MIT License** | Compatible with original MIT, permits enhancement fork |
| **TypeScript 5.7+** | Modern type system, ergonomics, matches original project |
| **pnpm workspace** | Maintains original monorepo structure, fast installs |
| **Vitest + oxlint** | Consistent with original toolchain |

### 6. Security Decisions

1. **No secrets in code**: All API keys via environment variables
2. **Redacted findings**: Credential/PII matches redacted in logs/output
3. **Validator functions**: Reduce false positives (e.g., Luhn check for credit cards)
4. **Secure defaults**: Encryption encouraged for storage, HTTPS enforced for network
5. **Audit logging**: All security scans logged with timestamps
6. **Supply chain**: Dependency scanning via `pnpm audit`, SBOM generation

### 7. Performance Decisions

1. **Android Snapshot Optimization**:
   - Snapshot caching with smart invalidation (TTL + change detection)
   - Batched geometry measurement calls (Issue #3533)
   - React Native sheet dialog fast-path handling

2. **Lazy Loading**: Platform modules loaded on-demand
3. **Connection Pooling**: Reuse device connections across commands
4. **Streaming MCP**: Progress updates without blocking

### 8. Scalability Considerations

- **Horizontal**: Multiple daemon instances via worktree isolation
- **Vertical**: Connection pooling, caching, lazy loading
- **Cloud**: Provider gateway abstracts device cloud differences
- **Parallel**: Session-per-worktree, device claims prevent conflicts

### 9. Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Developer  │────▶│   Local     │────▶│   Device    │
│  Machine    │     │  Daemon     │     │  (Sim/Phys) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   CI/CD     │
                    │  (GitHub    │
                    │   Actions)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │BrowserStack│   │AWS Device │   │  Limrun   │
    └───────────┘   │  Farm     │   └───────────┘
                    └───────────┘
```

### 10. Testing Strategy

| Layer | Approach | Tools |
|-------|----------|-------|
| Unit | Pure function testing, property-based | Vitest, fast-check |
| Integration | Platform runtime mocks, contract tests | Vitest, golden fixtures |
| E2E | Real device/simulator, replay scripts | agent-device test command |
| Mutation | Critical path coverage | Stryker |
| Performance | Snapshot acquisition benchmarks | Custom bench scripts |

### 11. Future Improvements

1. **Visual Regression**: Screenshot diffing with perceptual hashing
2. **AI Test Generation**: LLM-generated test cases from user stories
3. **Performance Profiling**: React Native bridge tracing, flame graphs
4. **Accessibility Auditing**: WCAG compliance checking via snapshots
5. **Cross-Platform Sync**: Shared test state across iOS/Android/Web
6. **Plugin SDK**: Third-party analysis modules

---

**Author**: George Nakisisa  
**Company**: GICT Africa Technologies  
**Date**: 2026-10-13  
**Reference**: callstack/agent-device (MIT License)