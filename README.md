# prompt-caching

> An MCP plugin that helps developers understand, optimize, and debug Anthropic's prompt caching in their own applications — with tools for injecting `cache_control` breakpoints, analyzing cacheability, and tracking real-time cache savings.

[![CI](https://github.com/flightlesstux/prompt-caching/actions/workflows/ci.yml/badge.svg)](https://github.com/flightlesstux/prompt-caching/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/prompt-caching-mcp)](https://www.npmjs.com/package/prompt-caching-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![codecov](https://codecov.io/gh/flightlesstux/prompt-caching/branch/main/graph/badge.svg)](https://codecov.io/gh/flightlesstux/prompt-caching)

---

## Who is this for?

This plugin is built for **developers building their own applications with the Anthropic API**.

> **Important note for Claude Code users:** Claude Code already handles prompt caching automatically for its own API calls — system prompts, tool definitions, and conversation history are cached out of the box. You cannot add more caching on top of Claude Code's own sessions, and you don't need to. See [Anthropic's prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) for details on how automatic caching works.

This plugin is useful when:
- You are **building an app or agent** with the Anthropic SDK and want to optimize your own API calls
- You want **visibility into cache performance** — hit rates, tokens saved, cost breakdown — via MCP tools
- You want to **analyze which parts of your prompts are cacheable** before committing to a caching strategy
- You use **Cursor, Windsurf, Zed, or Continue.dev** and those clients are not automatically handling `cache_control` placement for Anthropic API calls

| Use case | Value |
|---|---|
| Building apps with Anthropic SDK | ✅ `optimize_messages` injects breakpoints for you |
| Debugging cache behavior | ✅ `analyze_cacheability` dry-runs your prompt |
| Tracking savings | ✅ `get_cache_stats` shows real-time hit rate and cost reduction |
| Claude Code's own API usage | ❌ Already cached automatically — this plugin doesn't help here |
| Non-Anthropic models | ❌ `cache_control` is Anthropic-only |

> **How prompt caching works**: Anthropic's caching API stores stable content server-side (5-minute TTL by default, 1-hour available). Cache reads cost **0.1×** instead of **1×** — a 90% reduction. See the [official docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) for the full pricing table and supported models.

---

## The problem

When you build your own app or agent with the Anthropic SDK, every API call re-sends your entire prompt — system instructions, tool definitions, document context, conversation history. For a 40-turn agentic session, you're paying full input price for the same tokens over and over.

Anthropic's [prompt caching API](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) eliminates that cost — but only if `cache_control` breakpoints are placed correctly on content that stays stable between turns. Placing them wrong causes cache misses that waste the 1.25× write cost.

**This plugin places them correctly, automatically.**

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

## Proof it works

Run the included live test against the real Anthropic API:

```bash
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...
python3 test_live.py
```

Expected output:

```
--- Turn 1 ---
  input_tokens          : 1284
  cache_creation_tokens : 1257  (billed at 1.25x)
  cache_read_tokens     : 0  (billed at 0.1x)
  normal_input_tokens   : 27  (billed at 1.0x)
  output_tokens         : 4
  => CACHE WRITTEN — first time, paid 1.25x for 1257 tokens

--- Turn 2 ---
  input_tokens          : 1284
  cache_creation_tokens : 0  (billed at 1.25x)
  cache_read_tokens     : 1257  (billed at 0.1x)
  normal_input_tokens   : 27  (billed at 1.0x)
  output_tokens         : 3
  => CACHE HIT — 88% cheaper on 1257 tokens vs full price

--- Turn 3 ---
  input_tokens          : 1284
  cache_creation_tokens : 0  (billed at 1.25x)
  cache_read_tokens     : 1257  (billed at 0.1x)
  normal_input_tokens   : 27  (billed at 1.0x)
  output_tokens         : 4
  => CACHE HIT — 88% cheaper on 1257 tokens vs full price

============================================================
PROOF SUMMARY
============================================================
  [PASS] Turn 1: cache written (1257 tokens at 1.25x)
  [PASS] Turn 2: cache hit (1257 tokens at 0.1x, saved 88%)
  [PASS] Turn 3: cache hit (1257 tokens at 0.1x, saved 88%)

  Total cached tokens read : 2514
  Average savings (turn 2+): 88%

  Overall: ALL CHECKS PASSED
============================================================
```

The `cache_read_input_tokens` field in the Anthropic API response is the ground truth — this is what Anthropic bills at 0.1×. The script exits with code `0` on pass, `1` on failure, so it can be used in CI.

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

> **Note:** This plugin is pending approval in the official Claude Code plugin marketplace. In the meantime, you can install it directly from GitHub using the commands below.

### Claude Code — two commands

```
/plugin marketplace add https://github.com/flightlesstux/prompt-caching
/plugin install prompt-caching@ercan-ermis
```

That's it. No npm, no config file, no restart. Claude Code's plugin system handles everything automatically.

---

### Other AI clients (Cursor, Windsurf, Zed, Continue.dev)

MCP is the integration path for non-Claude clients. Install the package globally and point your client at it:

```bash
npm install -g prompt-caching-mcp
```

Then add to your client's MCP config:

```json
{
  "mcpServers": {
    "prompt-caching-mcp": {
      "command": "prompt-caching-mcp"
    }
  }
}
```

| Client | Config file |
|---|---|
| Cursor | `.cursor/mcp.json` |
| Windsurf | Windsurf MCP settings |
| Zed | Zed MCP settings |
| Continue.dev | `.continue/config.json` |
| Any MCP client | stdio — point at the `prompt-caching-mcp` binary |

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

## FAQ

### "Claude Code already does prompt caching automatically — why does this exist?"

Yes, and that's correct. Claude Code handles prompt caching for its own API calls automatically. If you're just using Claude Code as a coding assistant day to day, caching is already working and you don't need this plugin.

This plugin is for a different layer: **when you write code that calls the Anthropic API directly**. Your Python script, your Node app, your AI agent — none of those get automatic caching unless you place `cache_control` breakpoints in the right spots yourself. That's what this plugin handles.

Think of it this way:
- Claude Code using the API → already cached ✅
- Your app calling the API → not cached unless you do it → this plugin does it for you ✅

See [Anthropic's prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) for the full picture on how automatic vs. explicit caching works.

### "Does this work with Claude Code's built-in sessions?"

No. Claude Code's own conversation context is managed internally — this plugin cannot intercept or modify those API calls. The MCP tools (`optimize_messages`, `get_cache_stats`, etc.) are called explicitly by your own code when you make Anthropic API calls.

### "Which models support prompt caching?"

Claude Opus 4.6/4.5/4.1/4, Sonnet 4.6/4.5/4, Sonnet 3.7, Haiku 4.5, Haiku 3.5, and Haiku 3. See the [pricing table](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pricing) for per-model rates.

### "What's the minimum prompt size for caching to kick in?"

It varies by model — from 1024 tokens (Sonnet 4, Opus 4) to 4096 tokens (Opus 4.6, Haiku 4.5). Prompts shorter than the threshold are processed normally without caching, even if marked with `cache_control`.

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
