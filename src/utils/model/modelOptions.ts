// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { getInitialMainLoopModel } from '../../bootstrap/state.js'
import { isClaudeAISubscriber } from '../auth.js'
import { getModelStrings } from './modelStrings.js'
import { getAntModels } from './antModels.js'
import {
  COST_TIER_3_15,
  COST_HAIKU_45,
  formatModelPricing,
} from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import { getCustomModelConfigs, isCustomModel } from './customModels.js'
import { getAPIProvider } from './providers.js'
import { isModelAllowed } from './modelAllowlist.js'
import {
  getCanonicalName,
  getClaudeAiUserDefaultModelDescription,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  getDefaultHaikuModel,
  getDefaultFableModel,
  getDefaultVisionModel,
  getDefaultMainLoopModelSetting,
  getMarketingNameForModel,
  getUserSpecifiedModelSetting,
  getOpusPricingSuffix,
  renderDefaultModelSetting,
  type ModelSetting,
} from './model.js'
import { getGlobalConfig } from '../config.js'
import {
  CHATGPT_CODEX_DEFAULT_MODEL,
  CHATGPT_CODEX_MODEL_OPTIONS,
  isChatGPTAuthMode,
} from './chatgptModels.js'

// @[MODEL LAUNCH]: Update all the available and default model option strings below.

export type ModelOption = {
  value: ModelSetting
  label: string
  description: string
  descriptionForModel?: string
}

export function getDefaultOptionForUser(fastMode = false): ModelOption {
  if (process.env.USER_TYPE === 'ant') {
    const currentModel = renderDefaultModelSetting(
      getDefaultMainLoopModelSetting(),
    )
    return {
      value: null,
      label: 'Default (recommended)',
      description: `Use the default model for Ants (currently ${currentModel})`,
      descriptionForModel: `Default model (currently ${currentModel})`,
    }
  }

  // Subscribers
  if (isClaudeAISubscriber()) {
    return {
      value: null,
      label: 'Default (recommended)',
      description: getClaudeAiUserDefaultModelDescription(fastMode),
    }
  }

  // PAYG
  return {
    value: null,
    label: 'Default (recommended)',
    description: `使用默认模型（当前 ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())}）`,
  }
}

// @[MODEL LAUNCH]: Update or add model option functions (getSonnetXXOption, getOpusXXOption, etc.)
// with the new model's label and description. These appear in the /model picker.
function getSonnet46Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().sonnet46 : 'sonnet',
    label: 'Sonnet',
    description: `Sonnet 4.6 · Best for everyday tasks${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'Sonnet 4.6 - best for everyday tasks. Generally recommended for most coding tasks',
  }
}

export function getSonnet46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().sonnet46 + '[1m]' : 'sonnet[1m]',
    label: 'Sonnet (1M context)',
    description: `Sonnet 4.6 for long sessions${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'Sonnet 4.6 with 1M context window - for long sessions with large codebases',
  }
}

function getHaiku45Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 4.5 · Fastest for quick answers${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_45)}`}`,
    descriptionForModel:
      'Haiku 4.5 - fastest for quick answers. Lower cost but less capable than Sonnet 4.6.',
  }
}

// ── Single-option-per-tier helpers ───────────────────────────────────────────
// Each tier has exactly one option. The actual model is whatever
// getDefault*Model() resolves to, so env overrides and provider-specific
// defaults flow through the family alias unchanged. Label is derived from
// the marketing name (falls back to the raw model string for unknown IDs
// such as custom third-party models).
function getSingleOpusOption(fastMode = false): ModelOption {
  const opusModel = getDefaultOpusModel()
  const name = getMarketingNameForModel(opusModel) ?? opusModel
  return {
    value: 'opus',
    label: name,
    description: `Opus模型`,
    descriptionForModel: `${name} - most capable for complex work (${opusModel})`,
  }
}

function getSingleSonnetOption(): ModelOption {
  const sonnetModel = getDefaultSonnetModel()
  const name = getMarketingNameForModel(sonnetModel) ?? sonnetModel
  return {
    value: 'sonnet',
    label: name,
    description: `Sonnet模型`,
    descriptionForModel: `${name} - best for everyday tasks (${sonnetModel})`,
  }
}

function getSingleHaikuOption(): ModelOption {
  const haikuModel = getDefaultHaikuModel()
  const name = getMarketingNameForModel(haikuModel) ?? haikuModel
  return {
    value: 'haiku',
    label: name,
    description: `Haiku模型`,
    descriptionForModel: `${name} - fastest for quick answers (${haikuModel})`,
  }
}

// CCB: Fable tier — a configurable fourth tier positioned above Opus.
// Defaults to whatever ANTHROPIC_DEFAULT_FABLE_MODEL points to (or the Opus
// default if unset). The picker shows it right after Opus.
function getSingleFableOption(): ModelOption {
  const fableModel = getDefaultFableModel()
  const name = getMarketingNameForModel(fableModel) ?? fableModel
  return {
    value: 'fable',
    label: name,
    description: `Fable模型`,
    descriptionForModel: `${name} - fable tier (${fableModel})`,
  }
}

// CCB: Vision tier — 多模态专用档位，用于含图像请求的自动路由或手动切换。
// Defaults to ANTHROPIC_DEFAULT_VISION_MODEL / GEMINI_DEFAULT_VISION_MODEL or
// falls back to Sonnet (Claude 4+ 默认支持视觉). Picker shows it after Fable.
function getSingleVisionOption(): ModelOption {
  const visionModel = getDefaultVisionModel()
  const name = getMarketingNameForModel(visionModel) ?? visionModel
  return {
    value: 'vision',
    label: name,
    description: `Vision模型`,
    descriptionForModel: `${name} - vision tier for multimodal (${visionModel})`,
  }
}

function getMaxOpusOption(fastMode = false): ModelOption {
  return {
    value: 'opus',
    label: 'Opus 4.7',
    description: `Opus 4.7 · Most capable for complex work${fastMode ? getOpusPricingSuffix(true) : ''}`,
  }
}

function getMergedOpus1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus47 + '[1m]' : 'opus[1m]',
    label: 'Opus 4.7 (1M context)',
    description: `Opus 4.7 with 1M context · Most capable for complex work${!is3P && fastMode ? getOpusPricingSuffix(fastMode) : ''}`,
    descriptionForModel:
      'Opus 4.7 with 1M context - most capable for complex work',
  }
}

function getOpusPlanOption(): ModelOption {
  return {
    value: 'opusplan',
    label: 'Opus Plan Mode',
    description: 'Use Opus 4.7 in plan mode, Sonnet 4.6 otherwise',
  }
}

function getChatGPTCodexModelOptions(): ModelOption[] {
  return [
    {
      value: null,
      label: 'Default (recommended)',
      description: `Use the default ChatGPT Codex model (currently ${CHATGPT_CODEX_DEFAULT_MODEL})`,
      descriptionForModel: `Default ChatGPT Codex model (currently ${CHATGPT_CODEX_DEFAULT_MODEL})`,
    },
    ...CHATGPT_CODEX_MODEL_OPTIONS.map(model => ({
      value: model.value,
      label: model.label,
      description: model.description,
      descriptionForModel: `${model.description} (${model.value})`,
    })),
  ]
}

// @[MODEL LAUNCH]: Update the model picker lists below to include/reorder options for the new model.
// Each user tier (ant, Max/Team Premium, Pro/Team Standard/Enterprise, PAYG 1P, PAYG 3P) has its own list.
function getModelOptionsBase(fastMode = false): ModelOption[] {
  if (process.env.USER_TYPE === 'ant') {
    // Build options from antModels config
    const antModelOptions: ModelOption[] = getAntModels().map(m => ({
      value: m.alias,
      label: m.label,
      description: m.description ?? `[ANT-ONLY] ${m.label} (${m.model})`,
    }))

    return [
      getDefaultOptionForUser(),
      ...antModelOptions,
      getMergedOpus1MOption(fastMode),
      getSonnet46Option(),
      getSonnet46_1MOption(),
      getHaiku45Option(),
    ]
  }

  if (getAPIProvider() === 'openai' && isChatGPTAuthMode()) {
    return getChatGPTCodexModelOptions()
  }

  // Simplified picker: one option per tier (Opus / Fable / Vision / Sonnet / Haiku).
  // The actual model is resolved via getDefault*Model(), so env overrides
  // (ANTHROPIC_DEFAULT_OPUS_MODEL etc.) and provider-specific defaults
  // all flow through the same single option per tier.
  return [
    getDefaultOptionForUser(fastMode),
    getSingleOpusOption(fastMode),
    getSingleFableOption(),
    getSingleVisionOption(),
    getSingleSonnetOption(),
    getSingleHaikuOption(),
  ]
}

// @[MODEL LAUNCH]: Add the new model ID to the appropriate family pattern below
// so the "newer version available" hint works correctly.
/**
 * Map a full model name to its family alias and the marketing name of the
 * version the alias currently resolves to. Used to detect when a user has
 * a specific older version pinned and a newer one is available.
 */
function getModelFamilyInfo(
  model: string,
): { alias: string; currentVersionName: string } | null {
  const canonical = getCanonicalName(model)

  // Sonnet family
  if (
    canonical.includes('claude-sonnet-4-6') ||
    canonical.includes('claude-sonnet-4-5') ||
    canonical.includes('claude-sonnet-4-') ||
    canonical.includes('claude-3-7-sonnet') ||
    canonical.includes('claude-3-5-sonnet')
  ) {
    const currentName = getMarketingNameForModel(getDefaultSonnetModel())
    if (currentName) {
      return { alias: 'Sonnet', currentVersionName: currentName }
    }
  }

  // Opus family
  if (canonical.includes('claude-opus-4')) {
    const currentName = getMarketingNameForModel(getDefaultOpusModel())
    if (currentName) {
      return { alias: 'Opus', currentVersionName: currentName }
    }
  }

  // Haiku family
  if (
    canonical.includes('claude-haiku') ||
    canonical.includes('claude-3-5-haiku')
  ) {
    const currentName = getMarketingNameForModel(getDefaultHaikuModel())
    if (currentName) {
      return { alias: 'Haiku', currentVersionName: currentName }
    }
  }

  return null
}

/**
 * Returns a ModelOption for a known Anthropic model with a human-readable
 * label, and an upgrade hint if a newer version is available via the alias.
 * Returns null if the model is not recognized.
 */
function getKnownModelOption(model: string): ModelOption | null {
  const marketingName = getMarketingNameForModel(model)
  if (!marketingName) return null

  const familyInfo = getModelFamilyInfo(model)
  if (!familyInfo) {
    return {
      value: model,
      label: marketingName,
      description: model,
    }
  }

  // Check if the alias currently resolves to a different (newer) version
  if (marketingName !== familyInfo.currentVersionName) {
    return {
      value: model,
      label: marketingName,
      description: `Newer version available · select ${familyInfo.alias} for ${familyInfo.currentVersionName}`,
    }
  }

  // Same version as the alias — just show the friendly name
  return {
    value: model,
    label: marketingName,
    description: model,
  }
}

/**
 * Append user-configured custom third-party models (settings `customModels`) to
 * the picker options, deduped by value. Extracted for unit testing.
 */
export function appendCustomModelOptions(
  options: ModelOption[],
): ModelOption[] {
  for (const config of getCustomModelConfigs()) {
    if (!options.some(existing => existing.value === config.model)) {
      options.push({
        value: config.model,
        label: config.label ?? config.model,
        description: config.description ?? 'Custom model',
        descriptionForModel: config.description ?? 'Custom model',
      })
    }
  }
  return options
}

export function getModelOptions(fastMode = false): ModelOption[] {
  const options = getModelOptionsBase(fastMode)

  // Add the custom model from the ANTHROPIC_CUSTOM_MODEL_OPTION env var
  const envCustomModel = process.env.ANTHROPIC_CUSTOM_MODEL_OPTION
  if (
    envCustomModel &&
    !options.some(existing => existing.value === envCustomModel)
  ) {
    options.push({
      value: envCustomModel,
      label: process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME ?? envCustomModel,
      description:
        process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION ??
        `Custom model (${envCustomModel})`,
    })
  }

  // Append additional model options fetched during bootstrap
  for (const opt of getGlobalConfig().additionalModelOptionsCache ?? []) {
    if (!options.some(existing => existing.value === opt.value)) {
      options.push(opt)
    }
  }

  appendCustomModelOptions(options)

  // Add custom model from either the current model value or the initial one
  // if it is not already in the options.
  let customModel: ModelSetting = null
  const currentMainLoopModel = getUserSpecifiedModelSetting()
  const initialMainLoopModel = getInitialMainLoopModel()
  if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) {
    customModel = currentMainLoopModel
  } else if (initialMainLoopModel !== null) {
    customModel = initialMainLoopModel
  }
  if (customModel === null || options.some(opt => opt.value === customModel)) {
    return filterModelOptionsByAllowlist(options)
  } else if (customModel === 'opusplan') {
    return filterModelOptionsByAllowlist([...options, getOpusPlanOption()])
  } else if (customModel === 'opus' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([
      ...options,
      getMaxOpusOption(fastMode),
    ])
  } else if (customModel === 'opus[1m]' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([
      ...options,
      getMergedOpus1MOption(fastMode),
    ])
  } else {
    // Try to show a human-readable label for known Anthropic models, with an
    // upgrade hint if the alias now resolves to a newer version.
    const knownOption = getKnownModelOption(customModel)
    if (knownOption) {
      options.push(knownOption)
    } else {
      options.push({
        value: customModel,
        label: customModel,
        description: 'Custom model',
      })
    }
    return filterModelOptionsByAllowlist(options)
  }
}

/**
 * Filter model options by the availableModels allowlist.
 * Always preserves the "Default" option (value: null) and user-configured
 * custom models. Exported for unit testing.
 */
export function filterModelOptionsByAllowlist(
  options: ModelOption[],
): ModelOption[] {
  const settings = getSettings_DEPRECATED() || {}
  if (!settings.availableModels) {
    return options // No restrictions
  }
  return options.filter(
    opt =>
      opt.value === null ||
      // User-configured custom models are always selectable
      isCustomModel(opt.value) ||
      (opt.value !== null && isModelAllowed(opt.value)),
  )
}
