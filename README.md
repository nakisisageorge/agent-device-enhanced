<a href="https://github.com/nakisisageorge/agent-device-enhanced" align="center">
  <picture>
    <img alt="agent-device-enhanced: AI-powered mobile automation for AI coding agents" src="https://raw.githubusercontent.com/nakisisageorge/agent-device-enhanced/main/docs/assets/banner.jpg">
  </picture>
</a>

---

# agent-device-enhanced

[![npm version](https://img.shields.io/npm/v/@gict-africa/agent-device-enhanced.svg)](https://www.npmjs.com/package/@gict-africa/agent-device-enhanced)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.12+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Enhanced mobile app automation and verification for AI coding agents.** Substantial enhancement fork of [callstack/agent-device](https://github.com/callstack/agent-device) adding AI-powered selector generation, performance-optimized snapshots, streaming MCP server, AI screen recording with evidence extraction, security scanning, interactive architecture documentation, and improved developer experience.

---

## ⚡ Quick Start

```bash
# Install globally
npm install -g @gict-africa/agent-device-enhanced@latest

# Verify setup
agent-device doctor

# Explore workflows
agent-device help workflow
```

### Drive an App from the CLI

```bash
# Start a session on iOS Simulator
agent-device open Contacts --platform ios

# Inspect the screen (accessibility snapshot)
agent-device snapshot -i
# @e2 [button] "Add Contact"

# Use the ref and wait for UI to settle
agent-device press @e2 --settle

# Fill a field with AI-suggested selector
agent-device fill @e7 "Ada" --settle

# Get AI-powered selector suggestions
agent-device suggest-selector snapshot.json --target "Save button"

# Capture evidence and close
agent-device screenshot ./contact-form.png
agent-device close
```

### Add MCP Tools to Your Agent

```json
{
  "mcpServers": {
    "agent-device-enhanced": {
      "command": "agent-device",
      "args": ["mcp"]
    }
  }
}
```

The enhanced MCP server supports **streaming progress** for long operations and **rich tool descriptions** for better agent discoverability.

### Script It from Node.js

```typescript
import { createAgentDeviceClient } from '@gict-africa/agent-device-enhanced';

const client = createAgentDeviceClient({ session: 'qa-run' });
try {
  await client.apps.open({ app: 'com.apple.Preferences', platform: 'ios' });
  const snapshot = await client.capture.snapshot({ interactiveOnly: true });
  
  // Get AI-powered selector suggestions
  const selector = await client.ai.suggestSelector({
    snapshot,
    target: 'Save button',
    platform: 'ios'
  });
  
  if (selector.primaryChain) {
    await client.interactions.press({ ref: selector.primaryChain.targetRef });
  }
} finally {
  await client.sessions.close();
}
```

---

## 🚀 What's New (Enhancements)

| Feature | Description |
|---------|-------------|
| **🤖 AI Selector Generation** | LLM-powered resilient selectors with confidence scoring & fallback chains |
| **⚡ Android Snapshot Optimization** | Sub-2s snapshots via caching + batched geometry calls (fixes #3558) |
| **🔄 Streaming MCP Server** | Progress updates for long ops, rich tool metadata, structured errors |
| **🎬 AI Screen Recording** | Auto highlight detection (errors, crashes, network failures), evidence extraction, `.ad` replay generation |
| **🔐 Security Scanning** | Credential/PII detection, insecure storage audit, certificate pinning verification |
| **📊 Interactive Architecture Docs** | React Flow visualization - click through to source, expandable nodes |
| **🛠 Interactive REPL** | `agent-device repl` for live session exploration & time-travel debugging |

---

## 📦 Enhancement Packages

All new functionality is delivered as **independent, optional packages**:

| Package | Purpose | Install |
|---------|---------|---------|
| `@agent-device/ai-selector` | AI-powered selector generation from snapshots | Included |
| `@agent-device/screen-recording-ai` | AI-enhanced recording analysis | Included |
| `@agent-device/security-patterns` | Mobile security automation patterns | Included |

Each package can be used independently or via the main CLI.

---

## 🎯 What Agents Can Do (Enhanced)

- **Inspect app state** through accessibility snapshots, refs, selectors, React Native component trees
- **Act on visible UI** by tapping, pressing, filling, scrolling, gesturing, waiting, asserting
- **🤖 Generate resilient selectors** using AI from natural language descriptions
- **📱 Record with AI analysis** — automatic highlights, evidence extraction, replay scripts
- **🔐 Scan for security issues** — credentials, PII, insecure storage, cert pinning
- **🔄 Stream progress** via MCP for long-running operations
- **🐛 Debug interactively** with REPL and time-travel debugging
- **📚 Explore architecture** with interactive visualization

---

## 🏗 Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CLI       │────▶│   Daemon    │────▶│  Platform   │
│  (Enhanced) │     │  (Enhanced) │     │  Runtimes   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
              ┌────────────┼────────────┐      │
              ▼            ▼            ▼      ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │AI Selector│ │Screen Rec│ │ Security │ │ Providers│
        │  (NEW)   │ │  AI(NEW) │ │Patterns  │ │(Cloud)   │
        └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

[📖 View Interactive Architecture →](docs/architecture/architecture.html)

---

## 🛡 Security

Built-in security scanning for mobile apps:

```bash
# Scan session for credentials, PII, insecure storage, cert pinning
agent-device security-scan --session abc123 --app com.example.app
```

**Detects**:
- 🔑 40+ credential patterns (AWS, GitHub, GCP, Azure, Stripe, JWT, DB URIs)
- 🆔 PII (emails, phones, SSN, credit cards, medical records, crypto addresses)
- 💾 Insecure storage (SharedPreferences, Keychain, AsyncStorage, SQLite, Realm)
- 🔒 Certificate pinning (config extraction + MITM verification)
- 🌐 Network issues (cleartext HTTP, weak TLS)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture Visualization](docs/architecture/architecture.html) | Interactive React Flow diagram |
| [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md) | Architecture decisions & rationale |
| [PORTFOLIO_CASE_STUDY.md](PORTFOLIO_CASE_STUDY.md) | Full case study with before/after |
| [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) | Detailed enhancement plan |
| [AI Agent Setup](https://oss.callstack.com/agent-device/docs/agent-setup) | Per-client setup (original docs) |
| [Commands Reference](https://oss.callstack.com/agent-device/docs/commands) | All CLI commands (original docs) |

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# Mutation testing (critical paths)
pnpm mutation:run

# Performance benchmarks
pnpm bench:ios-snapshot
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) from the original project.

**Enhancement contributions welcome!** Focus areas:
- Additional LLM providers for AI selector
- More security patterns
- Platform-specific optimizations
- Architecture visualization improvements

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

**Original work**: [callstack/agent-device](https://github.com/callstack/agent-device) (MIT License)  
**Enhancements**: George Nakisisa / GICT Africa Technologies (MIT License)

---

## 🙏 Attribution

This project is a **substantial enhancement fork** of [callstack/agent-device](https://github.com/callstack/agent-device).

- Original authors: Callstack team and contributors
- Original license: MIT (preserved)
- Enhancements: Independent packages, performance optimizations, AI features, security scanning, documentation

We clearly distinguish:
- **ORIGINAL PROJECT** — callstack/agent-device
- **GICT / GEORGE'S IMPROVEMENTS** — This fork

> "Engineering improvement and independent development based on open-source technology."

---

## 👨‍💻 Author

**George Nakisisa**  
Senior Software Engineer · AI Engineer · Cybersecurity  
**Company**: GICT Africa Technologies  
**Website**: https://gictafrica.com  
**Email**: nakisisageorge@gmail.com  
**GitHub**: [@nakisisageorge](https://github.com/nakisisageorge)  
**Location**: Kampala, Uganda 🇺🇬

---

## 🔗 Links

- **Repository**: https://github.com/nakisisageorge/agent-device-enhanced
- **Issues**: https://github.com/nakisisageorge/agent-device-enhanced/issues
- **Original Project**: https://github.com/callstack/agent-device
- **Original Docs**: https://oss.callstack.com/agent-device/
- **npm Package**: https://www.npmjs.com/package/@gict-africa/agent-device-enhanced