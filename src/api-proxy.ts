import Anthropic from '@anthropic-ai/sdk'
import { optimizeMessages } from './prompt-optimizer.js'
import { TokenTracker } from './token-tracker.js'
import { loadConfig, type PluginConfig, type MessageParam, type SystemPrompt, type ToolDef } from './cache-analyzer.js'

export interface ProxyCreateParams {
  model: string
  max_tokens: number
  messages: MessageParam[]
  system?: SystemPrompt
  tools?: ToolDef[]
  [key: string]: unknown
}

export class AnthropicProxy {
  private readonly client: Anthropic
  private readonly tracker: TokenTracker
  private readonly config: PluginConfig

  constructor(apiKey: string, tracker: TokenTracker, config?: PluginConfig) {
    this.client = new Anthropic({ apiKey })
    this.tracker = tracker
    this.config = config ?? loadConfig()
  }

  async createMessage(params: ProxyCreateParams): Promise<Anthropic.Messages.Message> {
    const { model, max_tokens, messages, system, tools, ...rest } = params

    const result = optimizeMessages(messages, system, tools, this.config)

    const response = await this.client.messages.create({
      model,
      max_tokens,
      messages: result.optimizedMessages as Anthropic.Messages.MessageParam[],
      ...(result.optimizedSystem !== undefined
        ? { system: result.optimizedSystem as string | Anthropic.Messages.TextBlockParam[] }
        : {}),
      ...(result.optimizedTools !== undefined
        ? { tools: result.optimizedTools as unknown as Anthropic.Messages.Tool[] }
        : {}),
      ...rest,
    } as Anthropic.Messages.MessageCreateParamsNonStreaming)

    if (response.usage) {
      this.tracker.record(response.usage)
    }

    return response
  }
}

export function createProxy(apiKey: string, tracker: TokenTracker, config?: PluginConfig): AnthropicProxy {
  return new AnthropicProxy(apiKey, tracker, config)
}
