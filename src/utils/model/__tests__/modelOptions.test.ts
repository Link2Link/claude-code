import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import * as settingsModule from '../../settings/settings.js'

// ── Mocks ────────────────────────────────────────────────────────────────────
const settingsSnapshot = { ...settingsModule }
let mockSettings: Record<string, unknown> = {}

mock.module('src/utils/settings/settings.js', () => ({
  ...settingsSnapshot,
  getSettings_DEPRECATED: () => mockSettings,
  getInitialSettings: () => mockSettings,
  getSettingsForSource: () => mockSettings,
}))

afterAll(() => {
  mock.restore()
  mock.module('src/utils/settings/settings.js', () => settingsSnapshot)
})

const modelOptionsPath = '../modelOptions.js?modelOptionsTest'
const modelOptions = (await import(
  modelOptionsPath
)) as typeof import('../modelOptions.js')

const customModels = [
  {
    model: 'deepseek-chat',
    label: 'DeepSeek',
    description: '便宜快速',
  },
  { model: 'glm-5.1' },
]

beforeEach(() => {
  mockSettings = { customModels }
})

describe('appendCustomModelOptions', () => {
  test('appends configured custom models as ModelOptions', () => {
    const out = modelOptions.appendCustomModelOptions([])
    expect(out).toEqual([
      {
        value: 'deepseek-chat',
        label: 'DeepSeek',
        description: '便宜快速',
        descriptionForModel: '便宜快速',
      },
      {
        value: 'glm-5.1',
        label: 'glm-5.1',
        description: 'Custom model',
        descriptionForModel: 'Custom model',
      },
    ])
  })

  test('dedupes against existing options by value', () => {
    const existing = [
      { value: 'deepseek-chat', label: 'already', description: 'x' },
    ]
    const out = modelOptions.appendCustomModelOptions(existing)
    expect(out.filter(o => o.value === 'deepseek-chat')).toHaveLength(1)
    expect(out.map(o => o.value)).toContain('glm-5.1')
  })

  test('dedupes duplicate entries within the config list', () => {
    mockSettings = { customModels: [customModels[0], customModels[0]] }
    const out = modelOptions.appendCustomModelOptions([])
    expect(out.filter(o => o.value === 'deepseek-chat')).toHaveLength(1)
  })

  test('returns input unchanged when no customModels configured', () => {
    mockSettings = {}
    const input = [{ value: 'sonnet', label: 'Sonnet', description: '' }]
    expect(modelOptions.appendCustomModelOptions(input)).toBe(input)
  })
})

describe('filterModelOptionsByAllowlist', () => {
  const opt = (value: string | null) => ({
    value,
    label: String(value),
    description: '',
  })

  test('keeps everything when availableModels is unset', () => {
    mockSettings = { customModels }
    const input = [opt(null), opt('deepseek-chat'), opt('claude-sonnet-4-6')]
    const out = modelOptions.filterModelOptionsByAllowlist(input)
    expect(out).toHaveLength(3)
  })

  test('keeps custom models even when availableModels restricts others', () => {
    mockSettings = {
      customModels,
      availableModels: ['claude-sonnet-4-6'],
    }
    const input = [
      opt(null),
      opt('deepseek-chat'),
      opt('glm-5.1'),
      opt('claude-opus-4-7'),
    ]
    const out = modelOptions.filterModelOptionsByAllowlist(input)
    const values = out.map(o => o.value)
    expect(values).toContain(null)
    expect(values).toContain('deepseek-chat')
    expect(values).toContain('glm-5.1')
    expect(values).not.toContain('claude-opus-4-7')
  })

  test('keeps custom models even when availableModels is an empty array', () => {
    mockSettings = { customModels, availableModels: [] }
    const input = [opt(null), opt('deepseek-chat'), opt('claude-sonnet-4-6')]
    const out = modelOptions.filterModelOptionsByAllowlist(input)
    const values = out.map(o => o.value)
    expect(values).toContain(null)
    expect(values).toContain('deepseek-chat')
    expect(values).not.toContain('claude-sonnet-4-6')
  })

  test('keeps a custom model selected with the [1m] suffix', () => {
    mockSettings = { customModels, availableModels: ['claude-sonnet-4-6'] }
    const out = modelOptions.filterModelOptionsByAllowlist([
      opt('deepseek-chat[1m]'),
    ])
    expect(out.map(o => o.value)).toContain('deepseek-chat[1m]')
  })
})
