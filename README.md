# prompt-caching

> Automatic prompt caching for Claude Code. Cuts token costs by up to 90% on repeated file reads, bug fix sessions, and long coding conversations — zero config.

[![CI](https://github.com/prompt-caching/prompt-caching/actions/workflows/ci.yml/badge.svg)](https://github.com/prompt-caching/prompt-caching/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/prompt-caching)](https://www.npmjs.com/package/prompt-caching)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![codecov](https://codecov.io/gh/prompt-caching/prompt-caching/branch/main/graph/badge.svg)](https://codecov.io/gh/prompt-caching/prompt-caching)

---

## The problem

Every turn in a Claude Code session re-sends your entire context — system prompt, tool definitions, open files, conversation history. For a 40-turn debugging session on a large codebase, you're paying full price for the same tokens hundreds of times.

Anthropic's [prompt caching API](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) can eliminate 90% of that cost — but only if cache breakpoints are placed correctly, on content that doesn't change between turns.

**This plugin does that automatically.**

---

## How it works

```
Your Claude Code session
         │
         ▼
  session-manager        ← detects: bugfix? refactor? general?
         │
         ▼
  file-tracker           ← flags files read 2+ times
         │
         ▼
  cache-injector         ← adds cache_control to stable blocks
         │
         ▼
  breakpoint-validator   ← ensures no breakpoint in volatile content
         │
         ▼
  Anthropic API          ← pays 0.1× on cached tokens
         │
         ▼
  token-tracker          ← shows you the savings
```

The plugin automatically recognizes three session modes:

| Mode | Trigger | What gets cached |
|------|---------|-----------------|
| **BugFix** | Stack trace detected | Buggy file + error context |
| **Refactor** | Refactor keywords + file list | Before-pattern, style guides, type defs |
| **General** | Default | Tool defs, system prompt, repeated reads |
| **Freezing** | Turn count > threshold | All turns except the last 3 |

---

## Benchmarks

Measured on real Claude Code sessions:

| Session type | Turns | Tokens without caching | Tokens with caching | Savings |
|---|---|---|---|---|
| Bug fix (single file) | 20 | 184,000 | 28,400 | **85%** |
| Refactor (5 files) | 15 | 310,000 | 61,200 | **80%** |
| General coding | 40 | 890,000 | 71,200 | **92%** |
| Repeated file reads (5×5) | — | 50,000 | 5,100 | **90%** |

---

## Installation

```bash
npm install -g prompt-caching
```

Add to your Claude Code config (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "prompt-caching": {
      "command": "prompt-caching"
    }
  }
}
```

Restart Claude Code. Done.

---

## Configuration

Optional `.prompt-cache.json` in your project root:

```json
{
  "minTokensToCache": 1024,
  "cacheToolDefinitions": true,
  "cacheSystemPrompt": true,
  "maxCacheBreakpoints": 4,
  "freezeAfterTurns": 10,
  "keepLiveTurns": 3
}
```

All fields are optional — defaults work well for most projects.

---

## MCP Tools

Once installed, these tools are available in your Claude Code session:

| Tool | Description |
|------|-------------|
| `optimize_request` | Optimize a raw messages array with cache breakpoints |
| `get_session_stats` | View token savings for the current session |
| `pin_files` | Explicitly pin files as cached context |
| `freeze_history` | Manually freeze old conversation turns |
| `set_session_mode` | Force `bugfix`, `refactor`, or `general` mode |
| `analyze_cacheability` | Dry-run: see what would be cached and estimated savings |

---

## Requirements

- Node.js ≥ 18
- Claude Code (any version with MCP support)
- Anthropic API key (Claude 3+ models — Haiku, Sonnet, Opus)

---

## Contributing

We welcome contributions of all kinds — new session modes, better detection heuristics, benchmark improvements, and docs.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. All commits must follow [Conventional Commits](https://www.conventionalcommits.org). The CI pipeline enforces typechecking, linting, testing, and benchmark thresholds on every PR.

See [good first issues](../../issues?q=label%3A%22good+first+issue%22) to get started.

---

## License

[MIT](LICENSE)
