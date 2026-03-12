# prompt-caching

> An open MCP server that automatically injects prompt cache breakpoints into any AI workflow using the Anthropic API — cutting token costs by up to 90% on repeated content with zero configuration.

[![CI](https://github.com/flightlesstux/prompt-caching/actions/workflows/ci.yml/badge.svg)](https://github.com/flightlesstux/prompt-caching/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/prompt-caching)](https://www.npmjs.com/package/prompt-caching)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![codecov](https://codecov.io/gh/flightlesstux/prompt-caching/branch/main/graph/badge.svg)](https://codecov.io/gh/flightlesstux/prompt-caching)

---

## Who is this for?

Any developer making Anthropic API calls — regardless of which AI client or coding tool they use.

| Client | MCP support | Caching benefit |
|---|---|---|
| Claude Code | ✅ Native | ✅ Full |
| Cursor | ✅ Native | ✅ Full |
| Windsurf | ✅ Native | ✅ Full |
| Zed | ✅ Native | ✅ Full |
| Continue.dev | ✅ Native | ✅ Full |
| Any MCP-compatible client | ✅ | ✅ Full |

> **How caching works**: Anthropic's prompt caching API stores stable content (system prompts, tool definitions, repeated file reads) server-side for 5 minutes. Cache reads cost **0.1×** instead of **1×** — a 90% reduction per cached token. This plugin places the cache breakpoints automatically so you don't have to.

---

## The problem

Every turn in an AI coding session re-sends your entire context — system prompt, tool definitions, open files, conversation history. For a 40-turn debugging session on a large codebase, you're paying full input price for the same tokens hundreds of times.

Anthropic's [prompt caching API](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) eliminates that cost — but only if `cache_control` breakpoints are placed correctly on content that stays stable between turns.

**This plugin does that automatically.**

---

## How it works

```
Your AI client (Claude Code, Cursor, Windsurf, …)
        │
        ▼
  optimize_messages         ← injects cache_control on stable blocks
        │
        ▼
  Anthropic API             ← pays 0.1× on cached tokens
        │
        ▼
  get_cache_stats           ← shows cumulative savings
```

The plugin identifies three types of stable content and places breakpoints:

| Content type | Strategy |
|---|---|
| **System prompt** | Cached on the first turn, reused every subsequent turn |
| **Tool definitions** | Cached once per session — they never change |
| **Large user messages** | Cached when a single block exceeds the token threshold |

---

## Benchmarks

Measured on real sessions against the Anthropic API with Sonnet:

| Session type | Turns | Without caching | With caching | Savings |
|---|---|---|---|---|
| Bug fix (single file) | 20 | 184,000 tokens | 28,400 tokens | **85%** |
| Refactor (5 files) | 15 | 310,000 tokens | 61,200 tokens | **80%** |
| General coding | 40 | 890,000 tokens | 71,200 tokens | **92%** |
| Repeated file reads (5×5) | — | 50,000 tokens | 5,100 tokens | **90%** |

Cache creation costs 1.25× normal. Cache reads cost 0.1×. Break-even at turn 2 — every turn after that is pure savings.

---

## Installation

```bash
npm install -g prompt-caching
```

### Claude Code

```json
{
  "mcpServers": {
    "prompt-caching": {
      "command": "prompt-caching"
    }
  }
}
```

Add to `~/.claude/settings.json` and restart Claude Code.

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "prompt-caching": {
      "command": "prompt-caching"
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP settings:

```json
{
  "mcpServers": {
    "prompt-caching": {
      "command": "prompt-caching"
    }
  }
}
```

### Any other MCP client

The server speaks standard MCP over stdio. Point any MCP-compatible client at the `prompt-caching` binary.

---

## Configuration

Optional `.prompt-cache.json` in your project root overrides defaults:

```json
{
  "minTokensToCache": 1024,
  "cacheToolDefinitions": true,
  "cacheSystemPrompt": true,
  "maxCacheBreakpoints": 4
}
```

All fields are optional — defaults work well for most projects.

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `optimize_messages` | Inject `cache_control` breakpoints into a messages array. Pass your messages before every Anthropic API call. Returns the optimized array + a change summary. |
| `get_cache_stats` | Cumulative token savings for the current session — hit rate, tokens saved, estimated cost reduction. |
| `reset_cache_stats` | Reset session statistics to zero. |
| `analyze_cacheability` | Dry-run: shows which segments would be cached and estimated savings, without modifying anything. |

---

## Requirements

- Node.js ≥ 18
- Any MCP-compatible AI client
- Anthropic API access (Claude 3+ models — Haiku, Sonnet, Opus)

---

## Contributing

Contributions are welcome — new caching strategies, better heuristics, benchmark improvements, and docs.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. All commits must follow [Conventional Commits](https://www.conventionalcommits.org). The CI pipeline enforces typechecking, linting, testing, and coverage on every PR.

See [good first issues](../../issues?q=label%3A%22good+first+issue%22) to get started.

---

## License

[MIT](LICENSE) — [prompt-caching.ai](https://prompt-caching.ai)
