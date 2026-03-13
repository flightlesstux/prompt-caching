---
name: Bug Report
about: Cache breakpoint placed incorrectly, wrong mode detected, or tokens not being saved
title: "fix: "
labels: ["bug", "needs-triage"]
assignees: ""
---

## Describe the bug

<!-- Clear description of what went wrong. -->

## Session context

- Claude Code version:
- OS:
- Plugin version (`npm list prompt-caching-mcp`):
- Session mode detected: `bugfix` / `refactor` / `general` / `freezing`

## Minimal reproduction

<!-- Paste the message array (redact API keys and sensitive content) where wrong behavior occurred. -->

```json
[
  { "role": "user", "content": "..." },
  { "role": "assistant", "content": "..." }
]
```

## Expected behavior

<!-- What should `cache_control` have been placed on? -->

## Actual behavior

<!-- What was placed on `cache_control` instead? Or what was the error? -->

## Token stats output

<!-- Paste output of the `get_session_stats` MCP tool if available. -->

## Additional context

<!-- Anything else: error logs, screenshots, related issues. -->
