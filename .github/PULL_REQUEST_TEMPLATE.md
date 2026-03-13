## What does this PR do?

<!-- One paragraph. What problem does it solve and how? -->

## Type of change

- [ ] `feat` — new feature or session mode
- [ ] `fix` — bug fix
- [ ] `perf` — improves cache hit rate or reduces token overhead
- [ ] `refactor` — no behavior change
- [ ] `docs` — documentation only
- [ ] `test` — tests only
- [ ] `chore` — build/tooling/deps

## Related issue

Closes #

## How to test

<!-- Steps to reproduce the scenario this PR addresses, and verify the fix. -->

## Cache impact

<!-- For feat/fix/perf PRs: show before vs after on at least one session type. -->
<!-- Run: npm run benchmark -->

| Session type | Before | After |
|---|---|---|
| | | |

## Checklist

- [ ] `npm run typecheck` passes (zero type errors)
- [ ] `npm run lint` passes (zero warnings)
- [ ] `npm run test` passes (zero failures)
- [ ] New behavior has new tests
- [ ] Bug fixes include a regression test
- [ ] Commit messages follow Conventional Commits format
- [ ] No new dependencies added without prior issue discussion
- [ ] `breakpoint-validator.ts` is not bypassed
- [ ] CHANGELOG.md updated (for `feat` and `fix` only)
