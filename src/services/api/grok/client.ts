import OpenAI from 'openai'
import { getProxyFetchOptions } from 'src/utils/proxy.js'

/**
 * Environment variables:
 *
 * GROK_API_KEY (or XAI_API_KEY): Required. API key for the xAI Grok endpoint.
 * GROK_BASE_URL: Optional. Defaults to https://api.x.ai/v1.
 */

const DEFAULT_BASE_URL = 'https://api.x.ai/v1'

let cachedClient: OpenAI | null = null

export function getGrokClient(options?: {
  maxRetries?: number
  fetchOverride?: typeof fetch
  source?: string
  baseURL?: string
  apiKey?: string
}): OpenAI {
  // A per-model baseURL/apiKey override must not reuse the cached client, which
  // is bound to the global GROK_BASE_URL / GROK_API_KEY.
  const overridden = !!(options?.baseURL || options?.apiKey)
  if (cachedClient && !overridden) return cachedClient

  const apiKey =
    options?.apiKey ??
    (process.env.GROK_API_KEY || process.env.XAI_API_KEY || '')
  const baseURL =
    options?.baseURL ?? (process.env.GROK_BASE_URL || DEFAULT_BASE_URL)

  const client = new OpenAI({
    apiKey,
    baseURL,
    maxRetries: options?.maxRetries ?? 0,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }),
    ...(options?.fetchOverride && { fetch: options.fetchOverride }),
  })

  if (!options?.fetchOverride && !overridden) {
    cachedClient = client
  }

  return client
}

export function clearGrokClientCache(): void {
  cachedClient = null
}
