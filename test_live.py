#!/usr/bin/env python3
"""
Live proof test for Anthropic prompt caching.

Sends 3 turns with a large cached system prompt and verifies:
  - Turn 1: cache_creation_input_tokens > 0  (cache written)
  - Turn 2: cache_read_input_tokens > 0       (cache hit)
  - Turn 3: cache_read_input_tokens > 0       (cache hit again)

Requires: pip install anthropic
          ANTHROPIC_API_KEY set in environment

Usage:
  python3 test_live.py
"""

import sys
import anthropic

SYSTEM_PROMPT = "You are a helpful coding assistant. " + ("padding " * 600)  # ~1200 tokens

client = anthropic.Anthropic()
model = "claude-haiku-4-5-20251001"

results = []


def make_request(turn: int, user_message: str) -> dict:
    response = client.messages.create(
        model=model,
        max_tokens=50,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_message}],
    )

    u = response.usage
    cache_created = getattr(u, "cache_creation_input_tokens", 0) or 0
    cache_read = getattr(u, "cache_read_input_tokens", 0) or 0
    normal_input = u.input_tokens - cache_created - cache_read

    cost_normal = normal_input * 1.0
    cost_created = cache_created * 1.25
    cost_read = cache_read * 0.1
    total_units = cost_normal + cost_created + cost_read
    full_cost_units = u.input_tokens * 1.0
    savings_pct = (1 - total_units / full_cost_units) * 100 if full_cost_units > 0 else 0

    print(f"\n--- Turn {turn} ---")
    print(f"  input_tokens          : {u.input_tokens}")
    print(f"  cache_creation_tokens : {cache_created}  (billed at 1.25x)")
    print(f"  cache_read_tokens     : {cache_read}  (billed at 0.1x)")
    print(f"  normal_input_tokens   : {normal_input}  (billed at 1.0x)")
    print(f"  output_tokens         : {u.output_tokens}")
    if cache_created > 0:
        print(f"  => CACHE WRITTEN — first time, paid 1.25x for {cache_created} tokens")
    if cache_read > 0:
        print(f"  => CACHE HIT — {savings_pct:.0f}% cheaper on {cache_read} tokens vs full price")
    print(f"  reply: {response.content[0].text[:80]!r}")

    return {
        "turn": turn,
        "cache_created": cache_created,
        "cache_read": cache_read,
        "savings_pct": savings_pct,
    }


results.append(make_request(1, "Say hello in one word."))
results.append(make_request(2, "Say goodbye in one word."))
results.append(make_request(3, "Say thanks in one word."))

# ── Proof summary ──────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("PROOF SUMMARY")
print("=" * 60)

passed = True

t1 = results[0]
if t1["cache_created"] > 0 and t1["cache_read"] == 0:
    print(f"  [PASS] Turn 1: cache written ({t1['cache_created']} tokens at 1.25x)")
else:
    print(f"  [FAIL] Turn 1: expected cache_creation > 0, got {t1}")
    passed = False

for r in results[1:]:
    if r["cache_read"] > 0 and r["cache_created"] == 0:
        print(f"  [PASS] Turn {r['turn']}: cache hit ({r['cache_read']} tokens at 0.1x, saved {r['savings_pct']:.0f}%)")
    else:
        print(f"  [FAIL] Turn {r['turn']}: expected cache_read > 0, got {r}")
        passed = False

total_read = sum(r["cache_read"] for r in results[1:])
avg_savings = sum(r["savings_pct"] for r in results[1:]) / len(results[1:])
print(f"\n  Total cached tokens read : {total_read}")
print(f"  Average savings (turn 2+): {avg_savings:.0f}%")
print(f"\n  Overall: {'ALL CHECKS PASSED' if passed else 'SOME CHECKS FAILED'}")
print("=" * 60)

sys.exit(0 if passed else 1)
