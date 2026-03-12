import { describe, it, expect, beforeEach } from 'vitest'
import { TokenTracker } from '../token-tracker.js'

describe('TokenTracker', () => {
  let tracker: TokenTracker

  beforeEach(() => {
    tracker = new TokenTracker()
  })

  it('starts with zero stats', () => {
    const stats = tracker.getStats()
    expect(stats.turns).toBe(0)
    expect(stats.totalInputTokens).toBe(0)
    expect(stats.cacheCreationTokens).toBe(0)
    expect(stats.cacheReadTokens).toBe(0)
    expect(stats.estimatedSavings).toBe(0)
    expect(stats.hitRate).toBe(0)
  })

  it('records a turn and accumulates totals', () => {
    tracker.record({
      input_tokens: 1000,
      output_tokens: 200,
      cache_creation_input_tokens: 800,
      cache_read_input_tokens: 0,
    })
    const stats = tracker.getStats()
    expect(stats.turns).toBe(1)
    expect(stats.totalInputTokens).toBe(1000)
    expect(stats.totalOutputTokens).toBe(200)
    expect(stats.cacheCreationTokens).toBe(800)
    expect(stats.cacheReadTokens).toBe(0)
  })

  it('accumulates across multiple turns', () => {
    tracker.record({ input_tokens: 500, output_tokens: 100, cache_creation_input_tokens: 400, cache_read_input_tokens: 0 })
    tracker.record({ input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 400 })
    const stats = tracker.getStats()
    expect(stats.turns).toBe(2)
    expect(stats.totalInputTokens).toBe(600)
    expect(stats.cacheCreationTokens).toBe(400)
    expect(stats.cacheReadTokens).toBe(400)
  })

  it('computes hitRate correctly', () => {
    tracker.record({ cache_creation_input_tokens: 200, cache_read_input_tokens: 800 })
    const stats = tracker.getStats()
    expect(stats.hitRate).toBeCloseTo(0.8)
  })

  it('computes estimatedSavings as 90% of cache_read tokens', () => {
    tracker.record({ cache_read_input_tokens: 1000 })
    expect(tracker.getStats().estimatedSavings).toBe(900)
  })

  it('handles null/undefined usage fields gracefully', () => {
    tracker.record({ input_tokens: null, output_tokens: null, cache_creation_input_tokens: null, cache_read_input_tokens: null })
    const stats = tracker.getStats()
    expect(stats.totalInputTokens).toBe(0)
    expect(stats.turns).toBe(1)
  })

  it('reset clears all data', () => {
    tracker.record({ input_tokens: 500, cache_creation_input_tokens: 400, cache_read_input_tokens: 100 })
    tracker.reset()
    const stats = tracker.getStats()
    expect(stats.turns).toBe(0)
    expect(stats.totalInputTokens).toBe(0)
    expect(stats.hitRate).toBe(0)
  })

  it('hitRate is 0 when only creation tokens exist (no reads yet)', () => {
    tracker.record({ cache_creation_input_tokens: 500, cache_read_input_tokens: 0 })
    expect(tracker.getStats().hitRate).toBe(0)
  })

  it('accumulates correctly after reset', () => {
    tracker.record({ input_tokens: 1000, cache_creation_input_tokens: 800 })
    tracker.reset()
    tracker.record({ input_tokens: 200, cache_read_input_tokens: 150 })
    const stats = tracker.getStats()
    expect(stats.turns).toBe(1)
    expect(stats.totalInputTokens).toBe(200)
    expect(stats.cacheReadTokens).toBe(150)
    expect(stats.cacheCreationTokens).toBe(0)
  })

  it('estimatedSavings is 0 when no cache reads', () => {
    tracker.record({ input_tokens: 500, cache_creation_input_tokens: 400 })
    expect(tracker.getStats().estimatedSavings).toBe(0)
  })

  it('handles completely empty usage object', () => {
    tracker.record({})
    const stats = tracker.getStats()
    expect(stats.turns).toBe(1)
    expect(stats.totalInputTokens).toBe(0)
    expect(stats.cacheCreationTokens).toBe(0)
  })

  it('hitRate rounds to full hit when all tokens are reads', () => {
    tracker.record({ cache_creation_input_tokens: 0, cache_read_input_tokens: 1000 })
    expect(tracker.getStats().hitRate).toBe(1)
  })
})
