# Contributing to prompt-caching

Thank you for your interest in contributing. This plugin aims to be the definitive open-source solution for reducing Claude API token costs in coding workflows. Every contribution matters.

---

## Table of Contents

- [Before You Start](#before-you-start)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Architecture Guide](#architecture-guide)
- [Performance Benchmark Requirements](#performance-benchmark-requirements)

---

## Engineering Mindset

Read [BEST_PRACTICES.md](../BEST_PRACTICES.md) before writing any code. It defines the non-negotiable rules for tool design, server behavior, responses, security, and cross-platform support. PRs that violate these rules will be rejected regardless of functionality.

## Before You Start

- **Check existing issues** before opening a new one — your idea or bug may already be tracked.
- **Open an issue first** for any non-trivial change. Discuss the approach before writing code, especially for new session modes or cache strategies.
- **Small PRs win.** A focused 200-line PR gets reviewed in hours. A sprawling 2000-line PR sits for weeks.

---

## How to Contribute

### Reporting Bugs

Use the **Bug Report** issue template. Include:
- Your Claude Code version and OS
- Which session mode triggered the issue (bugfix/refactor/general/freezing)
- A minimal reproduction: the message array that caused wrong behavior
- Expected vs actual `cache_control` placement

### Requesting Features

Use the **Feature Request** template. Describe:
- The coding workflow you're optimizing
- Why current caching strategies don't cover it
- Rough idea of where in the architecture it fits (see `src/modes/` and `src/session/`)

### Good First Issues

Issues tagged [`good first issue`](../../issues?q=label%3A%22good+first+issue%22) are scoped, well-defined, and won't require deep architecture knowledge. Start here.

Issues tagged [`help wanted`](../../issues?q=label%3A%22help+wanted%22) are higher impact but need community expertise.

---

## Development Setup

```bash
git clone https://github.com/<your-fork>/prompt-caching.git
cd prompt-caching
make install
make dev          # watch mode — rebuilds on save
```

Before every commit, run the full verification suite:
```bash
make verify       # typecheck + lint + test in sequence — must all pass
```

All other available commands:
```bash
make              # show all commands with descriptions
make build        # compile TypeScript → dist/
make test-watch   # vitest watch mode
make benchmark    # cache hit rate benchmarks
make docker-build # build local Docker image
```

### Running Against a Real Anthropic API

Copy `.env.example` to `.env` and add your `ANTHROPIC_API_KEY`. Integration tests in `src/__tests__/integration/` will use it if present; they are skipped in CI without a key.

---

## Commit Convention

We use **Conventional Commits**. Every commit message must follow this format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE or closes #issue]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or new session mode |
| `fix` | Bug fix |
| `perf` | Performance improvement to cache hit rate or token reduction |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build process, dependency updates, tooling |

### Examples

```
feat(modes): add code-review session mode for PR diff caching
fix(freezer): breakpoint placed inside volatile content on turn 12+
perf(injector): skip cache_control when block < 1024 tokens
docs(readme): add benchmark results for 40-turn refactor session
chore(deps): upgrade @anthropic-ai/sdk to 0.30.0
```

**Breaking changes** must include `BREAKING CHANGE:` in the commit footer and will trigger a major version bump.

---

## Pull Request Process

1. **Branch naming**: `feat/short-description`, `fix/issue-number-description`, `docs/what-changed`
2. **Base branch**: always target `main`
3. **Fill the PR template** completely — PRs with empty sections will be returned
4. **One concern per PR** — don't mix features, fixes, and refactors
5. **Tests required**: new behavior needs new tests; bug fixes need a regression test
6. **Benchmark required for perf PRs**: include before/after token counts from a real session

### Review SLA

- Maintainers aim to review within **48 hours** on weekdays
- Two approvals required for changes to `src/optimizer/` or `src/session/` (core cache logic)
- One approval sufficient for docs, tests, and non-core changes

### What Gets Rejected

- PRs that reduce cache hit rate on the benchmark suite
- PRs without tests for new code paths
- PRs that add dependencies without discussion in an issue first
- Commits that don't follow the convention (CI will block them)

---

## Architecture Guide

Before contributing to core files, understand the data flow:

```
User message array
      ↓
session-manager.ts   → detects mode (bugfix / refactor / general)
      ↓
file-tracker.ts      → identifies repeated file reads
      ↓
cache-injector.ts    → adds cache_control to stable blocks
      ↓
breakpoint-validator.ts → ensures no breakpoint in volatile content
      ↓
Anthropic API call
      ↓
token-tracker.ts     → records cache_creation / cache_read tokens
```

**The single most important invariant**: a cache breakpoint must only appear at the end of a block where every token *before* it is identical to the previous turn. Violating this causes a cache miss and charges creation cost with zero benefit. `breakpoint-validator.ts` is the gatekeeper — don't bypass it.

New session modes belong in `src/modes/`. Each mode implements the `SessionMode` interface:

```typescript
interface SessionMode {
  name: string
  detect(messages: MessageParam[]): boolean
  getCacheableSegments(messages: MessageParam[]): CacheableSegment[]
}
```

---

## Performance Benchmark Requirements

The benchmark suite in `src/__tests__/benchmarks/` measures cache hit rate across four canonical session types:

| Session type | Min cache hit rate |
|---|---|
| 20-turn bug fix | ≥ 75% |
| 15-turn refactor | ≥ 70% |
| 40-turn general | ≥ 80% (frozen prefix) |
| Repeated file reads (5 files × 5 reads) | ≥ 90% |

PRs must not regress these numbers. Run benchmarks with:

```bash
npm run benchmark
```

---

## Questions?

Open a [Discussion](../../discussions) — not an issue — for questions, ideas, or architecture conversations. Issues are for bugs and confirmed feature requests only.
