# Best Practices

This document defines the engineering mindset for this project. All contributors — and all code — must follow these rules. They are not suggestions.

---

## Tool Design

**One tool, one job.**
Each MCP tool does exactly one thing. `optimize_request` optimizes. `get_session_stats` reports. `pin_files` pins. Never combine concerns into one tool.

**Tool descriptions are prompts.**
Claude reads the description to decide when and how to call a tool. Be precise and specific.

```
// Wrong
"Optimize messages"

// Correct
"Optimize a messages array by injecting cache_control breakpoints on stable
content blocks. Returns a summary of changes — not the full array."
```

**Define output schemas for every tool.**
Every tool must declare its return shape via `outputSchema`. Without a schema, Claude dumps the raw response into its context window — the exact problem this plugin exists to prevent. No schema = no merge.

**Strict input validation.**
Reject malformed inputs at the boundary with a clear error message. Never let bad input propagate into core logic.

---

## MCP Server Rules

**stdout is the MCP wire. Never touch it.**
`console.log()` in a tool handler writes to stdout, which the MCP client interprets as a protocol message and corrupts the session. All debug and error output goes to `stderr` only.

```typescript
// Wrong — kills the MCP session
console.log('debug:', value)

// Correct
process.stderr.write(`debug: ${value}\n`)
```

**Never crash the server.**
An unhandled exception in a tool handler terminates the MCP server and breaks the user's entire Claude Code session. Every tool handler must catch all errors and return a proper error response.

```typescript
// Every handler follows this pattern
try {
  // ... tool logic
} catch (err) {
  return {
    isError: true,
    content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
  }
}
```

**Use stdio transport for local execution.**
This plugin runs locally. Stdio is correct. HTTP/streamable transport is for remote, multi-tenant servers — not this use case.

---

## Responses & Context

**Keep responses small.**
Return only what the caller needs. `get_session_stats` returns a summary object — not a full turn-by-turn log. Verbose responses flood the context window.

**Return structured JSON, not prose.**
Return typed objects. Let Claude format them for the user. Never return a human-readable paragraph when a structured object will do.

```typescript
// Wrong
return { content: [{ type: 'text', text: 'Cache hit rate was 85% saving 12000 tokens' }] }

// Correct
return {
  content: [{
    type: 'text',
    text: JSON.stringify({ hitRate: 0.85, tokensSaved: 12000, turnsActive: 20 })
  }]
}
```

**The irony rule.**
A prompt-caching plugin that floods context has failed at its core mission. If `optimize_request` returns the full optimized message array verbatim, it doubles the context. Return a diff or a change summary — never the full payload.

---

## Security

**Never log API keys.**
Tool inputs may contain API keys. Never write them to stderr, session files, or any persistent storage.

**Sandbox file path inputs.**
The `pin_files` tool accepts file paths from the user. Always resolve them against `process.cwd()` and reject any path that escapes the project root.

```typescript
import path from 'path'

function assertSafePath(inputPath: string): string {
  const resolved = path.resolve(process.cwd(), inputPath)
  if (!resolved.startsWith(process.cwd())) {
    throw new Error(`Path escapes project root: ${inputPath}`)
  }
  return resolved
}
```

**This plugin runs at Claude Code privilege level.**
A vulnerability here means filesystem access, command execution, and network operations on the user's machine. Treat every tool input as untrusted.

---

## Cross-Platform

**All code must run on Linux, macOS, and Windows.** CI enforces this with a 9-job matrix. See the cross-platform rules table in [CLAUDE.md](CLAUDE.md).

The short version:
- `path.join()` — never string concatenation with `/`
- `os.homedir()` — never `~` or `process.env.HOME`
- `os.tmpdir()` — never `/tmp`
- All path logic lives in `src/utils/paths.ts`

---

## Testing

**Unit-test tool handlers in isolation.**
Mock the MCP SDK. Test the handler logic directly — input in, output out.

**Integration-test with MCP Inspector.**
Use `@modelcontextprotocol/inspector` to call tools over the real protocol and inspect the wire exchange before shipping.

**Tests must pass on all 3 OS.**
No OS-specific skips. Use `if (process.platform === 'win32')` guards inside tests when behavior genuinely differs, but the test must run and pass on all platforms.

**Bug fixes ship with a regression test.**
If a bug gets fixed without a test, it will come back.

---

## Commits

One commit per concern. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full convention.
The short rule: if your commit message needs "and", split it into two commits.
