# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Claude Code MCP plugin that automatically applies Anthropic's [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) to reduce token costs in coding workflows. It wraps the Anthropic SDK to inject `cache_control` markers intelligently and reports cache savings.

**Core value proposition**: In agentic coding sessions, large system prompts, tool definitions, and document context are re-sent on every turn. This plugin identifies these stable, reusable segments and marks them for caching, achieving up to 90% cost reduction on repeated content.

## Engineering Mindset

All code in this repo follows [BEST_PRACTICES.md](BEST_PRACTICES.md). Read it before writing any code. Key rules that affect every file:
- stdout is the MCP wire — never `console.log()` in tool handlers, use `stderr`
- Every tool handler must catch all errors and return `{ isError: true, ... }` — never throw
- Every tool must define `outputSchema` — no schema, no merge
- The irony rule: this plugin must never flood context itself — tool responses must be small and structured

## Cross-Platform Requirements

This plugin runs on **Linux, macOS, and Windows**. Every code path and every test must pass on all three. CI runs a 9-job matrix (3 OS × 3 Node versions).

### Rules — always follow these

| Topic | Wrong | Correct |
|---|---|---|
| Path construction | `dir + '/' + file` | `path.join(dir, file)` |
| Home directory | `~` or `process.env.HOME` | `os.homedir()` |
| Temp directory | `'/tmp'` | `os.tmpdir()` |
| Config path | hardcoded string | `path.join(os.homedir(), '.claude', 'settings.json')` |
| Line endings | `\r\n` | `\n` (`.gitattributes` enforces LF on all platforms) |
| Process signals | `SIGTERM` only | `SIGINT` + `SIGTERM` (`SIGTERM` is not available on Windows) |
| File permissions | `fs.chmod(...)` alone | guard with `if (process.platform !== 'win32')` |
| Shell commands | `sh -c ...` | avoid; use Node `fs`/`child_process` with `shell: true` only when necessary |

### Path utilities

All file path logic lives in `src/utils/paths.ts`. Never resolve paths inline — add a helper there and import it. This is the file the smoke-test job validates on each OS.

### Writing cross-platform tests

- Use `path.join` for any expected path strings in assertions
- For OS-specific behavior, use `if (process.platform === 'win32')` guards inside tests — do not skip tests entirely
- Fixture files use LF line endings; don't assert on `\r\n`

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **MCP framework**: `@modelcontextprotocol/sdk`
- **Anthropic SDK**: `@anthropic-ai/sdk`
- **Build**: `tsc` → `dist/`
- **Test**: `vitest`
- **Package manager**: `npm`

## Commands

```bash
npm run build       # tsc compile → dist/
npm run dev         # tsx watch mode for development
npm run test        # vitest run
npm run test:watch  # vitest watch
npm run lint        # eslint src/
npm run typecheck   # tsc --noEmit
```

To run a single test file:
```bash
npx vitest run src/__tests__/cache-analyzer.test.ts
```

To run the MCP server locally (for Claude Code integration):
```bash
node dist/index.js
```

## Architecture

```
src/
├── index.ts              # MCP server entry point — registers tools and starts server
├── cache-analyzer.ts     # Segments prompts into cacheable vs. volatile blocks
├── prompt-optimizer.ts   # Injects cache_control markers into message arrays
├── token-tracker.ts      # Accumulates usage stats across turns (cache hits/misses)
├── api-proxy.ts          # Thin wrapper around Anthropic SDK that applies optimization
└── __tests__/
```

### Key Design Decisions

**Caching strategy**: Anthropic's cache is keyed on the exact prefix of a conversation up to the `cache_control` breakpoint. The optimizer inserts breakpoints at:
1. The end of the system prompt (almost always static)
2. The end of tool definitions block (static within a session)
3. The end of large document/code injections (static within a task)

Breakpoints must be placed so that the prefix before each one never changes between turns. Placing a breakpoint too late (inside volatile content) causes a cache miss and wastes the creation cost.

**Cache control placement rules** (enforced in `cache-analyzer.ts`):
- Only the last `user` or `system` message in a stable prefix gets a breakpoint
- Tool definitions are always cacheable if they don't change mid-session
- Content blocks shorter than ~1000 tokens are not worth caching (overhead > savings)

**Token tracking**: The Anthropic API response includes `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens`. `token-tracker.ts` accumulates these across turns and exposes a summary via the `get_cache_stats` MCP tool.

### MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `optimize_messages` | Takes a raw messages array, returns one with `cache_control` injected |
| `get_cache_stats` | Returns cumulative token savings for the current session |
| `reset_cache_stats` | Resets the session statistics |
| `analyze_cacheability` | Dry-run: shows which segments would be marked and estimated savings |

### Configuration (`.prompt-cache.json` in project root)

```json
{
  "minTokensToCache": 1024,
  "cacheToolDefinitions": true,
  "cacheSystemPrompt": true,
  "maxCacheBreakpoints": 4
}
```

## Prompt Caching Primer (Anthropic API)

- Cache lifetime: 5 minutes (ephemeral), extended by hits
- Supported models: Claude 3+ (Haiku, Sonnet, Opus)
- Cache is per-model, per-workspace
- `cache_creation_input_tokens` cost = 1.25× normal input rate
- `cache_read_input_tokens` cost = 0.1× normal input rate — the 90% savings
- Max 4 `cache_control` breakpoints per request

## Adding to Claude Code

In `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "prompt-caching": {
      "command": "node",
      "args": ["/path/to/prompt-caching/dist/index.js"]
    }
  }
}
```
