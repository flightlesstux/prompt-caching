export interface TurnUsage {
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  inputTokens: number
  outputTokens: number
  timestamp: number
}

export interface CacheStats {
  turns: number
  totalInputTokens: number
  totalOutputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  /** Tokens saved vs. no caching (cache_read costs 0.1× vs 1× normal) */
  estimatedSavings: number
  /** cache_read / (cache_creation + cache_read), 0 if no cache activity */
  hitRate: number
}

export class TokenTracker {
  private _turns: TurnUsage[] = []

  record(usage: {
    cache_creation_input_tokens?: number | null
    cache_read_input_tokens?: number | null
    input_tokens?: number | null
    output_tokens?: number | null
  }): void {
    this._turns.push({
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      timestamp: Date.now(),
    })
  }

  getStats(): CacheStats {
    const turns = this._turns.length
    const totalInputTokens = this._turns.reduce((s, t) => s + t.inputTokens, 0)
    const totalOutputTokens = this._turns.reduce((s, t) => s + t.outputTokens, 0)
    const cacheCreationTokens = this._turns.reduce((s, t) => s + t.cacheCreationInputTokens, 0)
    const cacheReadTokens = this._turns.reduce((s, t) => s + t.cacheReadInputTokens, 0)

    // Savings: each cache_read token costs 0.1× instead of 1×, saving 0.9× per token
    const estimatedSavings = Math.round(cacheReadTokens * 0.9)

    const cacheTotal = cacheCreationTokens + cacheReadTokens
    const hitRate = cacheTotal > 0 ? cacheReadTokens / cacheTotal : 0

    return {
      turns,
      totalInputTokens,
      totalOutputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      estimatedSavings,
      hitRate,
    }
  }

  reset(): void {
    this._turns = []
  }
}
