import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import { AnthropicProxy, createProxy } from '../api-proxy.js'
import { TokenTracker } from '../token-tracker.js'
import { DEFAULT_CONFIG, type PluginConfig } from '../cache-analyzer.js'

const config: PluginConfig = { ...DEFAULT_CONFIG, minTokensToCache: 10 }
const longText = 'x'.repeat(200)

const fakeResponse = {
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'ok' }],
  model: 'claude-sonnet-4-6',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 100,
    output_tokens: 20,
    cache_creation_input_tokens: 80,
    cache_read_input_tokens: 0,
  },
}

describe('AnthropicProxy', () => {
  let tracker: TokenTracker
  let proxy: AnthropicProxy

  beforeEach(() => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValue(fakeResponse)
    tracker = new TokenTracker()
    proxy = new AnthropicProxy('test-key', tracker, config)
  })

  it('calls Anthropic messages.create', async () => {
    await proxy.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('injects cache_control into large messages before API call', async () => {
    await proxy.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: longText }],
    })
    const callArgs = mockCreate.mock.calls[0][0]
    const content = callArgs.messages[0].content
    expect(Array.isArray(content)).toBe(true)
    const last = content[content.length - 1]
    expect(last.cache_control).toEqual({ type: 'ephemeral' })
  })

  it('records usage from the API response', async () => {
    await proxy.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'hi' }],
    })
    const stats = tracker.getStats()
    expect(stats.turns).toBe(1)
    expect(stats.cacheCreationTokens).toBe(80)
    expect(stats.totalInputTokens).toBe(100)
  })

  it('accumulates usage across multiple calls', async () => {
    await proxy.createMessage({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: 'a' }] })
    await proxy.createMessage({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: 'b' }] })
    expect(tracker.getStats().turns).toBe(2)
    expect(tracker.getStats().totalInputTokens).toBe(200)
  })

  it('passes system prompt when provided', async () => {
    await proxy.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'hi' }],
      system: longText,
    })
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.system).toBeDefined()
  })

  it('passes tools when provided', async () => {
    const tools = [{ name: 'tool', description: longText, input_schema: { type: 'object' } }]
    await proxy.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'hi' }],
      tools,
    })
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.tools).toBeDefined()
  })

  it('returns the API response', async () => {
    const result = await proxy.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result).toBe(fakeResponse)
  })

  it('handles response with no usage gracefully', async () => {
    mockCreate.mockResolvedValue({ ...fakeResponse, usage: null })
    await expect(
      proxy.createMessage({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: 'hi' }] })
    ).resolves.toBeDefined()
    expect(tracker.getStats().turns).toBe(0)
  })
})

describe('createProxy', () => {
  it('returns an AnthropicProxy instance', () => {
    const tracker = new TokenTracker()
    const proxy = createProxy('key', tracker, config)
    expect(proxy).toBeInstanceOf(AnthropicProxy)
  })
})
