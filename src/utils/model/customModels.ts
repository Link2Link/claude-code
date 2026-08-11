import { getSettings_DEPRECATED } from '../settings/settings.js'
import type { CustomModelConfig } from '../settings/types.js'
import { getAPIProvider } from './providers.js'

export type CustomModelProtocol =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'grok'
  | 'responses'

/** All user-configured custom third-party models, in config order. */
export function getCustomModelConfigs(): CustomModelConfig[] {
  return getSettings_DEPRECATED()?.customModels ?? []
}

/** Strip the [1m]/[2m] suffix before matching. Model names stay case-sensitive. */
function customModelKey(model: string): string {
  return model.replace(/\[(1|2)m\]$/i, '').trim()
}

/**
 * Find the custom model config for a model string (used at request time, e.g.
 * "deepseek-chat" matches an entry with model "deepseek-chat" or "deepseek-chat[1m]").
 */
export function getCustomModelConfig(
  model: string,
): CustomModelConfig | undefined {
  const key = customModelKey(model)
  return getCustomModelConfigs().find(c => customModelKey(c.model) === key)
}

export function isCustomModel(model: string): boolean {
  return getCustomModelConfig(model) !== undefined
}

/** Resolve the API key for a custom model: literal `apiKey`, else apiKeyEnv. */
export function resolveCustomModelApiKey(
  config: CustomModelConfig,
): string | undefined {
  if (config.apiKey) return config.apiKey
  if (!config.apiKeyEnv) return undefined
  return process.env[config.apiKeyEnv] || undefined
}

/**
 * Resolve the Bearer token for a custom Anthropic-protocol model: literal
 * `authToken`, else authTokenEnv. Sent as `Authorization: Bearer <token>`.
 */
export function resolveCustomModelAuthToken(
  config: CustomModelConfig,
): string | undefined {
  if (config.authToken) return config.authToken
  if (!config.authTokenEnv) return undefined
  return process.env[config.authTokenEnv] || undefined
}

/**
 * Wire protocol a custom model speaks. Falls back to the active global provider
 * so that a custom model with no explicit protocol reuses the current setup.
 */
export function getCustomModelProtocol(
  config: CustomModelConfig,
): CustomModelProtocol {
  if (config.protocol) return config.protocol
  switch (getAPIProvider()) {
    case 'openai':
      return 'openai'
    case 'gemini':
      return 'gemini'
    case 'grok':
      return 'grok'
    default: // firstParty, bedrock, vertex, foundry
      return 'anthropic'
  }
}

/**
 * Context window override (in tokens) for a custom model. Returns undefined
 * when the model is not custom or no `contextWindow` field is configured.
 */
export function getCustomModelContextWindow(model: string): number | undefined {
  return getCustomModelConfig(model)?.contextWindow
}

/**
 * Max output tokens override for a custom model. Returns undefined when the
 * model is not custom or no `maxTokens` field is configured.
 */
export function getCustomModelMaxOutputTokens(
  model: string,
): number | undefined {
  return getCustomModelConfig(model)?.maxTokens
}
