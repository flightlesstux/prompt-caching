import { describe, it, expect } from 'vitest'
import { optimizeMessages } from '../prompt-optimizer.js'
import { DEFAULT_CONFIG, type MessageParam, type PluginConfig } from '../cache-analyzer.js'

const config: PluginConfig = { ...DEFAULT_CONFIG, minTokensToCache: 10 }
const longText = 'x'.repeat(200) // ~50 tokens

function hasCacheControl(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (o['cache_control'] != null) return true
  for (const val of Object.values(o)) {
    if (hasCacheControl(val)) return true
  }
  return false
}

describe('optimizeMessages', () => {
  it('adds cache_control to a large system prompt string', () => {
    const result = optimizeMessages([], longText, undefined, config)
    expect(result.breakpointsAdded).toBe(1)
    expect(Array.isArray(result.optimizedSystem)).toBe(true)
    const sys = result.optimizedSystem as Array<{ cache_control?: unknown }>
    expect(sys[sys.length - 1].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('adds cache_control to last block of system array', () => {
    const system = [
      { type: 'text' as const, text: longText },
      { type: 'text' as const, text: 'addendum' },
    ]
    const result = optimizeMessages([], system, undefined, config)
    const sys = result.optimizedSystem as Array<{ cache_control?: unknown }>
    expect(sys[sys.length - 1].cache_control).toEqual({ type: 'ephemeral' })
    expect(sys[0].cache_control).toBeUndefined()
  })

  it('skips system prompt when too short', () => {
    const result = optimizeMessages([], 'hi', undefined, { ...config, minTokensToCache: 1000 })
    expect(result.breakpointsAdded).toBe(0)
  })

  it('does not add cache_control to system when cacheSystemPrompt is false', () => {
    const result = optimizeMessages([], longText, undefined, { ...config, cacheSystemPrompt: false })
    expect(result.breakpointsAdded).toBe(0)
    expect(result.optimizedSystem).toBe(longText)
  })

  it('adds cache_control to last tool when tools are large enough', () => {
    const tools = [{ name: 'a', description: longText, input_schema: {} }]
    const result = optimizeMessages([], undefined, tools, config)
    expect(result.breakpointsAdded).toBe(1)
    const last = result.optimizedTools![result.optimizedTools!.length - 1]
    expect(last.cache_control).toEqual({ type: 'ephemeral' })
  })

  it('caches large user message content', () => {
    const messages: MessageParam[] = [{ role: 'user', content: longText }]
    const result = optimizeMessages(messages, undefined, undefined, config)
    expect(result.breakpointsAdded).toBe(1)
    const content = result.optimizedMessages[0].content
    expect(Array.isArray(content)).toBe(true)
    const arr = content as Array<{ cache_control?: unknown }>
    expect(arr[arr.length - 1].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('does not cache assistant messages', () => {
    const messages: MessageParam[] = [{ role: 'assistant', content: longText }]
    const result = optimizeMessages(messages, undefined, undefined, config)
    expect(hasCacheControl(result.optimizedMessages)).toBe(false)
  })

  it('converts string content to array with cache_control', () => {
    const messages: MessageParam[] = [{ role: 'user', content: longText }]
    const result = optimizeMessages(messages, undefined, undefined, config)
    expect(Array.isArray(result.optimizedMessages[0].content)).toBe(true)
  })

  it('respects maxCacheBreakpoints budget', () => {
    const messages: MessageParam[] = Array.from({ length: 5 }, () => ({ role: 'user' as const, content: longText }))
    const result = optimizeMessages(messages, longText, undefined, { ...config, maxCacheBreakpoints: 2 })
    expect(result.breakpointsAdded).toBe(2)
  })

  it('does not mutate the input messages array', () => {
    const messages: MessageParam[] = [{ role: 'user', content: longText }]
    const original = JSON.stringify(messages)
    optimizeMessages(messages, undefined, undefined, config)
    expect(JSON.stringify(messages)).toBe(original)
  })

  it('does not mutate input tools array', () => {
    const tools = [{ name: 'a', description: longText, input_schema: {} }]
    const original = JSON.stringify(tools)
    optimizeMessages([], undefined, tools, config)
    expect(JSON.stringify(tools)).toBe(original)
  })
})
