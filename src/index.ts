#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { getConfigPath } from './utils/paths.js'
import { loadConfig } from './cache-analyzer.js'
import { TokenTracker } from './token-tracker.js'
import {
  handleOptimizeMessages,
  handleGetCacheStats,
  handleResetCacheStats,
  handleAnalyzeCacheability,
  handleRecordUsage,
  handleUnknownTool,
} from './handlers.js'

const args = process.argv.slice(2)
if (args.includes('--version')) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string }
  process.stdout.write(`prompt-caching v${pkg.version}\n`)
  process.exit(0)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string }

const config = loadConfig()
const tracker = new TokenTracker()

process.stderr.write(`[prompt-caching] Config path: ${getConfigPath()}\n`)
process.stderr.write('[prompt-caching] Starting MCP server...\n')

const server = new Server(
  { name: 'prompt-caching', version: pkg.version },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'optimize_messages',
      description:
        'Inject cache_control breakpoints into a messages array so stable content is cached by the Anthropic API. Returns the optimized messages, system, and tools alongside a change summary. Use before every API call to reduce token costs.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          messages: {
            type: 'array',
            description: 'Messages array to optimize.',
            items: { type: 'object' },
          },
          system: {
            description: 'Optional system prompt — string or array of text blocks.',
          },
          tools: {
            type: 'array',
            description: 'Optional tool definitions array.',
            items: { type: 'object' },
          },
        },
        required: ['messages'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          optimizedMessages: { type: 'array', items: { type: 'object' } },
          optimizedSystem: {},
          optimizedTools: { type: 'array', items: { type: 'object' } },
          breakpointsAdded: { type: 'number' },
          cacheableTokens: { type: 'number' },
          segments: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'get_cache_stats',
      description:
        'Return cumulative token usage and cache savings for the current MCP session. Includes hit rate and estimated savings.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      outputSchema: {
        type: 'object',
        properties: {
          turns: { type: 'number' },
          totalInputTokens: { type: 'number' },
          totalOutputTokens: { type: 'number' },
          cacheCreationTokens: { type: 'number' },
          cacheReadTokens: { type: 'number' },
          estimatedSavings: { type: 'number' },
          hitRate: { type: 'number' },
        },
      },
    },
    {
      name: 'reset_cache_stats',
      description: 'Reset session token usage statistics to zero.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      outputSchema: {
        type: 'object',
        properties: {
          reset: { type: 'boolean' },
        },
      },
    },
    {
      name: 'analyze_cacheability',
      description:
        'Dry-run: show which segments of a messages array would receive cache_control breakpoints and the estimated token savings, without modifying anything.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          messages: {
            type: 'array',
            description: 'Messages array to analyze.',
            items: { type: 'object' },
          },
          system: {
            description: 'Optional system prompt — string or array of text blocks.',
          },
          tools: {
            type: 'array',
            description: 'Optional tool definitions array.',
            items: { type: 'object' },
          },
        },
        required: ['messages'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          segments: { type: 'array', items: { type: 'object' } },
          totalEstimatedTokens: { type: 'number' },
          cacheableTokens: { type: 'number' },
          recommendedBreakpoints: { type: 'number' },
        },
      },
    },
    {
      name: 'record_usage',
      description:
        'Record token usage from an Anthropic API response into the session stats. Call this after every API response to track cumulative cache savings. Pass the usage object from the response.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          input_tokens:                  { type: 'number', description: 'Total input tokens billed.' },
          output_tokens:                 { type: 'number', description: 'Total output tokens billed.' },
          cache_creation_input_tokens:   { type: 'number', description: 'Tokens written to cache (costs 1.25×).' },
          cache_read_input_tokens:       { type: 'number', description: 'Tokens read from cache (costs 0.1×).' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          recorded: { type: 'boolean' },
          sessionStats: {
            type: 'object',
            properties: {
              turns:                { type: 'number' },
              totalInputTokens:     { type: 'number' },
              totalOutputTokens:    { type: 'number' },
              cacheCreationTokens:  { type: 'number' },
              cacheReadTokens:      { type: 'number' },
              estimatedSavings:     { type: 'number' },
              hitRate:              { type: 'number' },
            },
          },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params
  try {
    switch (name) {
      case 'optimize_messages':    return handleOptimizeMessages(toolArgs, config)
      case 'get_cache_stats':      return handleGetCacheStats(tracker)
      case 'reset_cache_stats':    return handleResetCacheStats(tracker)
      case 'analyze_cacheability': return handleAnalyzeCacheability(toolArgs, config)
      case 'record_usage':         return handleRecordUsage(toolArgs, tracker)
      default:                     return handleUnknownTool(name)
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
process.stderr.write('[prompt-caching] MCP server ready\n')
