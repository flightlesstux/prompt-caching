import {
  analyzeMessages,
  type MessageParam,
  type SystemPrompt,
  type ToolDef,
  type PluginConfig,
} from './cache-analyzer.js'
import { optimizeMessages } from './prompt-optimizer.js'
import type { TokenTracker } from './token-tracker.js'

export interface ToolResult {
  isError?: boolean
  content: Array<{ type: string; text: string }>
  [key: string]: unknown
}

export function handleOptimizeMessages(args: unknown, config: PluginConfig): ToolResult {
  const { messages, system, tools } = args as {
    messages: MessageParam[]
    system?: SystemPrompt
    tools?: ToolDef[]
  }
  if (!Array.isArray(messages)) {
    return { isError: true, content: [{ type: 'text', text: 'Error: messages must be an array' }] }
  }
  const result = optimizeMessages(messages, system, tools, config)
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          optimizedMessages: result.optimizedMessages,
          optimizedSystem: result.optimizedSystem,
          optimizedTools: result.optimizedTools,
          breakpointsAdded: result.breakpointsAdded,
          cacheableTokens: result.analysis.cacheableTokens,
          segments: result.analysis.segments,
        }),
      },
    ],
  }
}

export function handleGetCacheStats(tracker: TokenTracker): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(tracker.getStats()) }] }
}

export function handleResetCacheStats(tracker: TokenTracker): ToolResult {
  tracker.reset()
  return { content: [{ type: 'text', text: JSON.stringify({ reset: true }) }] }
}

export function handleAnalyzeCacheability(args: unknown, config: PluginConfig): ToolResult {
  const { messages, system, tools } = args as {
    messages: MessageParam[]
    system?: SystemPrompt
    tools?: ToolDef[]
  }
  if (!Array.isArray(messages)) {
    return { isError: true, content: [{ type: 'text', text: 'Error: messages must be an array' }] }
  }
  const analysis = analyzeMessages(messages, system, tools, config)
  return { content: [{ type: 'text', text: JSON.stringify(analysis) }] }
}

export function handleRecordUsage(args: unknown, tracker: TokenTracker): ToolResult {
  const usage = args as {
    input_tokens?: number | null
    output_tokens?: number | null
    cache_creation_input_tokens?: number | null
    cache_read_input_tokens?: number | null
  }
  if (!usage || typeof usage !== 'object') {
    return { isError: true, content: [{ type: 'text', text: 'Error: usage must be an object' }] }
  }
  tracker.record(usage)
  const stats = tracker.getStats()
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          recorded: true,
          sessionStats: stats,
        }),
      },
    ],
  }
}

export function handleUnknownTool(name: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: `Error: unknown tool: ${name}` }] }
}
