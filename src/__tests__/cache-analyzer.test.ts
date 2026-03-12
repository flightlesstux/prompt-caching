import { describe, it, expect } from 'vitest'
import {
  estimateTokens,
  analyzeMessages,
  DEFAULT_CONFIG,
  type MessageParam,
  type PluginConfig,
} from '../cache-analyzer.js'

const config: PluginConfig = { ...DEFAULT_CONFIG, minTokensToCache: 10 }

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('estimates ~1 token per 4 chars', () => {
    expect(estimateTokens('1234')).toBe(1)
    expect(estimateTokens('12345678')).toBe(2)
  })

  it('rounds up', () => {
    expect(estimateTokens('123')).toBe(1)
    expect(estimateTokens('12345')).toBe(2)
  })
})

describe('analyzeMessages', () => {
  const shortMsg: MessageParam = { role: 'user', content: 'hi' }
  const longText = 'x'.repeat(200) // 50 tokens
  const longMsg: MessageParam = { role: 'user', content: longText }
  const assistantMsg: MessageParam = { role: 'assistant', content: longText }

  it('classifies system prompt as cacheable when large enough', () => {
    const result = analyzeMessages([], 'x'.repeat(200), undefined, config)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].kind).toBe('system')
    expect(result.segments[0].cacheable).toBe(true)
  })

  it('classifies short system prompt as not cacheable', () => {
    const result = analyzeMessages([], 'short', undefined, { ...config, minTokensToCache: 100 })
    expect(result.segments[0].cacheable).toBe(false)
  })

  it('skips system analysis when cacheSystemPrompt is false', () => {
    const result = analyzeMessages([], longText, undefined, { ...config, cacheSystemPrompt: false })
    expect(result.segments.filter(s => s.kind === 'system')).toHaveLength(0)
  })

  it('classifies large user message as document (cacheable)', () => {
    const result = analyzeMessages([longMsg], undefined, undefined, config)
    const seg = result.segments.find(s => s.messageIndex === 0)
    expect(seg?.kind).toBe('document')
    expect(seg?.cacheable).toBe(true)
  })

  it('classifies short user message as volatile', () => {
    const result = analyzeMessages([shortMsg], undefined, undefined, { ...config, minTokensToCache: 100 })
    expect(result.segments[0].kind).toBe('volatile')
    expect(result.segments[0].cacheable).toBe(false)
  })

  it('classifies assistant messages as volatile regardless of size', () => {
    const result = analyzeMessages([assistantMsg], undefined, undefined, config)
    const seg = result.segments[0]
    expect(seg.kind).toBe('volatile')
    expect(seg.cacheable).toBe(false)
  })

  it('classifies large tool array as cacheable', () => {
    const tools = [{ name: 'tool', description: 'x'.repeat(200), input_schema: {} }]
    const result = analyzeMessages([], undefined, tools, config)
    const seg = result.segments.find(s => s.kind === 'tools')
    expect(seg?.cacheable).toBe(true)
  })

  it('skips tools when cacheToolDefinitions is false', () => {
    const tools = [{ name: 'tool', description: 'x'.repeat(200), input_schema: {} }]
    const result = analyzeMessages([], undefined, tools, { ...config, cacheToolDefinitions: false })
    expect(result.segments.filter(s => s.kind === 'tools')).toHaveLength(0)
  })

  it('computes totals correctly', () => {
    const result = analyzeMessages([longMsg, shortMsg], longText, undefined, config)
    expect(result.totalEstimatedTokens).toBeGreaterThan(0)
    expect(result.cacheableTokens).toBeLessThanOrEqual(result.totalEstimatedTokens)
  })

  it('caps recommendedBreakpoints at maxCacheBreakpoints', () => {
    const manyLong: MessageParam[] = Array.from({ length: 10 }, () => ({ role: 'user', content: longText }))
    const result = analyzeMessages(manyLong, longText, undefined, { ...config, maxCacheBreakpoints: 2 })
    expect(result.recommendedBreakpoints).toBeLessThanOrEqual(2)
  })

  it('handles array content blocks', () => {
    const msg: MessageParam = {
      role: 'user',
      content: [{ type: 'text', text: 'x'.repeat(200) }],
    }
    const result = analyzeMessages([msg], undefined, undefined, config)
    expect(result.segments[0].cacheable).toBe(true)
  })

  it('returns no segments for empty messages with no system or tools', () => {
    const result = analyzeMessages([], undefined, undefined, config)
    expect(result.segments).toHaveLength(0)
    expect(result.totalEstimatedTokens).toBe(0)
    expect(result.cacheableTokens).toBe(0)
    expect(result.recommendedBreakpoints).toBe(0)
  })

  it('recommendedBreakpoints is 0 when maxCacheBreakpoints is 0', () => {
    const manyLong: MessageParam[] = Array.from({ length: 5 }, () => ({ role: 'user' as const, content: longText }))
    const result = analyzeMessages(manyLong, longText, undefined, { ...config, maxCacheBreakpoints: 0 })
    expect(result.recommendedBreakpoints).toBe(0)
  })

  it('ignores empty tools array', () => {
    const result = analyzeMessages([], undefined, [], config)
    expect(result.segments.filter(s => s.kind === 'tools')).toHaveLength(0)
  })

  it('cacheableTokens is 0 when nothing meets the threshold', () => {
    const result = analyzeMessages(
      [{ role: 'user', content: 'hi' }],
      'short',
      undefined,
      { ...config, minTokensToCache: 99999 }
    )
    expect(result.cacheableTokens).toBe(0)
  })

  it('extracts text from tool_result content blocks', () => {
    const msg: MessageParam = {
      role: 'user',
      content: [{ type: 'tool_result', content: [{ type: 'text', text: 'x'.repeat(200) }] }],
    }
    const result = analyzeMessages([msg], undefined, undefined, config)
    expect(result.segments[0].estimatedTokens).toBeGreaterThan(0)
  })

  it('system as TextBlockParam array is supported', () => {
    const system = [{ type: 'text' as const, text: longText }]
    const result = analyzeMessages([], system, undefined, config)
    expect(result.segments[0].kind).toBe('system')
    expect(result.segments[0].cacheable).toBe(true)
  })

  it('messageIndex is set correctly on each segment', () => {
    const messages: MessageParam[] = [
      { role: 'user', content: longText },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: longText },
    ]
    const result = analyzeMessages(messages, undefined, undefined, config)
    const msgSegs = result.segments.filter(s => s.messageIndex !== undefined)
    expect(msgSegs[0].messageIndex).toBe(0)
    expect(msgSegs[1].messageIndex).toBe(1)
    expect(msgSegs[2].messageIndex).toBe(2)
  })
})
