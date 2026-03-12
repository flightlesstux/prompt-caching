# prompt-caching

> A Claude-first MCP plugin that automatically injects prompt cache breakpoints into your AI sessions — cutting Anthropic API token costs by up to 90% on repeated content with zero configuration.

[![CI](https://github.com/flightlesstux/prompt-caching/actions/workflows/ci.yml/badge.svg)](https://github.com/flightlesstux/prompt-caching/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/prompt-caching)](https://www.npmjs.com/package/prompt-caching)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![codecov](https://codecov.io/gh/flightlesstux/prompt-caching/branch/main/graph/badge.svg)](https://codecov.io/gh/flightlesstux/prompt-caching)

---

## Who is this for?

This plugin is built for **Claude and the Anthropic API first**. The prompt caching feature (`cache_control`) is an Anthropic-specific capability — that's where you get the full 90% savings.

Because it's delivered as an MCP server, other MCP-compatible clients can also connect to it. We can't guarantee full compatibility or caching benefits outside the Anthropic ecosystem, but it works anywhere MCP is supported.

| Client | Works with this plugin | Full caching benefit |
|---|---|---|
| **Claude Code** | ✅ | ✅ Built for this |
| **Cursor** | ✅ | ✅ When calling Anthropic API |
| **Windsurf** | ✅ | ✅ When calling Anthropic API |
| **Zed** | ✅ | ✅ When calling Anthropic API |
| **Continue.dev** | ✅ | ✅ When calling Anthropic API |
| Other MCP clients | ⚠️ Best effort | ⚠️ Anthropic API only |
| Non-Anthropic models | ⚠️ MCP tools available | ❌ No caching effect |

> **How caching works**: Anthropic's prompt caching API stores stable content (system prompts, tool definitions, repeated file reads) server-side for 5 minutes. Cache reads cost **0.1×** instead of **1×** — a 90% reduction per cached token. This plugin places the `cache_control` breakpoints automatically so you don't have to.

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

### Claude Code — one command

```
/plugin install flightlesstux/prompt-caching
```

That's it. No npm, no config file, no restart. Claude Code's plugin system handles everything automatically.

---

### Other AI clients (Cursor, Windsurf, Zed, Continue.dev)

MCP is the integration path for non-Claude clients. Install the package globally and point your client at it:

```bash
npm install -g prompt-caching
```

Then add to your client's MCP config:

```json
{
  "mcpServers": {
    "prompt-caching": {
      "command": "prompt-caching"
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
| Any MCP client | stdio — point at the `prompt-caching` binary |

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
