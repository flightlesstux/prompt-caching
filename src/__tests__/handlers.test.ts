import { describe, it, expect, beforeEach } from 'vitest'
import {
  handleOptimizeMessages,
  handleGetCacheStats,
  handleResetCacheStats,
  handleAnalyzeCacheability,
  handleRecordUsage,
  handleUnknownTool,
} from '../handlers.js'
import { TokenTracker } from '../token-tracker.js'
import { DEFAULT_CONFIG, type PluginConfig } from '../cache-analyzer.js'

const config: PluginConfig = { ...DEFAULT_CONFIG, minTokensToCache: 10 }
const longText = 'x'.repeat(200)

describe('handleOptimizeMessages', () => {
  it('returns isError when messages is not an array', () => {
    const result = handleOptimizeMessages({ messages: 'bad' }, config)
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/messages must be an array/)
  })

  it('returns isError when messages is missing', () => {
    const result = handleOptimizeMessages({}, config)
    expect(result.isError).toBe(true)
  })

  it('returns structured JSON for valid input', () => {
    const result = handleOptimizeMessages({ messages: [{ role: 'user', content: longText }] }, config)
    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed).toHaveProperty('optimizedMessages')
    expect(parsed).toHaveProperty('breakpointsAdded')
    expect(parsed).toHaveProperty('cacheableTokens')
    expect(parsed).toHaveProperty('segments')
  })

  it('returns breakpointsAdded > 0 for cacheable content', () => {
    const result = handleOptimizeMessages({ messages: [{ role: 'user', content: longText }] }, config)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.breakpointsAdded).toBeGreaterThan(0)
  })

  it('returns breakpointsAdded = 0 for empty messages with no system', () => {
    const result = handleOptimizeMessages({ messages: [] }, config)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.breakpointsAdded).toBe(0)
  })

  it('passes system and tools through', () => {
    const result = handleOptimizeMessages(
      { messages: [], system: longText, tools: [{ name: 't', description: longText, input_schema: {} }] },
      config
    )
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.optimizedSystem).toBeDefined()
    expect(parsed.optimizedTools).toBeDefined()
  })
})

describe('handleGetCacheStats', () => {
  it('returns zero stats on fresh tracker', () => {
    const tracker = new TokenTracker()
    const result = handleGetCacheStats(tracker)
    const stats = JSON.parse(result.content[0].text)
    expect(stats.turns).toBe(0)
    expect(stats.hitRate).toBe(0)
  })

  it('reflects recorded usage', () => {
    const tracker = new TokenTracker()
    tracker.record({ cache_read_input_tokens: 1000 })
    const result = handleGetCacheStats(tracker)
    const stats = JSON.parse(result.content[0].text)
    expect(stats.cacheReadTokens).toBe(1000)
    expect(stats.estimatedSavings).toBe(900)
  })
})

describe('handleResetCacheStats', () => {
  it('returns { reset: true }', () => {
    const tracker = new TokenTracker()
    const result = handleResetCacheStats(tracker)
    expect(JSON.parse(result.content[0].text)).toEqual({ reset: true })
  })

  it('clears tracker state', () => {
    const tracker = new TokenTracker()
    tracker.record({ input_tokens: 500, cache_creation_input_tokens: 400 })
    handleResetCacheStats(tracker)
    expect(tracker.getStats().turns).toBe(0)
  })
})

describe('handleAnalyzeCacheability', () => {
  it('returns isError when messages is not an array', () => {
    const result = handleAnalyzeCacheability({ messages: null }, config)
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/messages must be an array/)
  })

  it('returns analysis structure for valid input', () => {
    const result = handleAnalyzeCacheability(
      { messages: [{ role: 'user', content: longText }] },
      config
    )
    const analysis = JSON.parse(result.content[0].text)
    expect(analysis).toHaveProperty('segments')
    expect(analysis).toHaveProperty('totalEstimatedTokens')
    expect(analysis).toHaveProperty('cacheableTokens')
    expect(analysis).toHaveProperty('recommendedBreakpoints')
  })

  it('does not modify the messages (dry-run)', () => {
    const messages = [{ role: 'user', content: longText }]
    const original = JSON.stringify(messages)
    handleAnalyzeCacheability({ messages }, config)
    expect(JSON.stringify(messages)).toBe(original)
  })

  it('reports cacheable tokens for large system prompt', () => {
    const result = handleAnalyzeCacheability(
      { messages: [], system: longText },
      config
    )
    const analysis = JSON.parse(result.content[0].text)
    expect(analysis.cacheableTokens).toBeGreaterThan(0)
  })
})

describe('handleRecordUsage', () => {
  it('records usage and returns session stats', () => {
    const tracker = new TokenTracker()
    const result = handleRecordUsage(
      { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 800, cache_read_input_tokens: 0 },
      tracker
    )
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.recorded).toBe(true)
    expect(parsed.sessionStats.turns).toBe(1)
    expect(parsed.sessionStats.totalInputTokens).toBe(1000)
    expect(parsed.sessionStats.cacheCreationTokens).toBe(800)
  })

  it('accumulates across multiple calls', () => {
    const tracker = new TokenTracker()
    handleRecordUsage({ cache_creation_input_tokens: 500 }, tracker)
    const result = handleRecordUsage({ cache_read_input_tokens: 400 }, tracker)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.sessionStats.turns).toBe(2)
    expect(parsed.sessionStats.cacheReadTokens).toBe(400)
    expect(parsed.sessionStats.estimatedSavings).toBe(360)
  })

  it('returns isError for non-object input', () => {
    const tracker = new TokenTracker()
    const result = handleRecordUsage('bad', tracker)
    expect(result.isError).toBe(true)
  })

  it('returns hitRate in session stats', () => {
    const tracker = new TokenTracker()
    handleRecordUsage({ cache_creation_input_tokens: 200, cache_read_input_tokens: 800 }, tracker)
    const parsed = JSON.parse(handleRecordUsage({ cache_read_input_tokens: 0 }, tracker).content[0].text)
    expect(parsed.sessionStats.hitRate).toBeGreaterThan(0)
  })
})

describe('handleUnknownTool', () => {
  it('returns isError with tool name in message', () => {
    const result = handleUnknownTool('does_not_exist')
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/does_not_exist/)
  })
})
