import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from 'bun:test'
import * as providersModule from '../providers.js'
import * as settingsModule from '../../settings/settings.js'

// ── Mocks (process-global in Bun — restore in afterAll) ─────────────────────
// We only override what the helpers read: settings.customModels and the global
// provider. Everything else keeps its real export so no other module breaks.

const settingsSnapshot = { ...settingsModule }
const providersSnapshot = { ...providersModule }

let mockSettings: Record<string, unknown> = {}
let mockProvider: string = 'firstParty'

mock.module('src/utils/settings/settings.js', () => ({
  ...settingsSnapshot,
  getSettings_DEPRECATED: () => mockSettings,
  getInitialSettings: () => mockSettings,
  getSettingsForSource: () => mockSettings,
}))
mock.module('src/utils/model/providers.js', () => ({
  ...providersSnapshot,
  getAPIProvider: () => mockProvider as never,
}))

afterAll(() => {
  mock.restore()
  mock.module('src/utils/settings/settings.js', () => settingsSnapshot)
  mock.module('src/utils/model/providers.js', () => providersSnapshot)
})

// Import AFTER mocks are registered. The query suffix gives this file its own
// module instance so cross-file customModels mocks cannot replace the subject.
const customModelsPath = '../customModels.js?customModelsTest'
const customModels = (await import(
  customModelsPath
)) as typeof import('../customModels.js')

const configs = [
  {
    model: 'deepseek-chat',
    label: 'DeepSeek',
    description: '便宜快速',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    protocol: 'openai' as const,
  },
  { model: 'glm-5.1' },
]

beforeEach(() => {
  mockSettings = { customModels: configs }
  mockProvider = 'firstParty'
  delete process.env.DEEPSEEK_API_KEY
})

afterEach(() => {
  delete process.env.DEEPSEEK_API_KEY
})

describe('getCustomModelConfigs', () => {
  test('returns the configured list', () => {
    expect(customModels.getCustomModelConfigs()).toEqual(configs)
  })

  test('returns [] when customModels is unset', () => {
    mockSettings = {}
    expect(customModels.getCustomModelConfigs()).toEqual([])
  })
})

describe('getCustomModelConfig / isCustomModel', () => {
  test('matches the exact model id', () => {
    expect(customModels.getCustomModelConfig('deepseek-chat')).toEqual(
      configs[0],
    )
  })

  test('matches a [1m]-suffixed model string', () => {
    expect(customModels.getCustomModelConfig('deepseek-chat[1m]')).toEqual(
      configs[0],
    )
  })

  test('is case-sensitive', () => {
    expect(customModels.getCustomModelConfig('DeepSeek-Chat')).toBeUndefined()
  })

  test('isCustomModel true/false', () => {
    expect(customModels.isCustomModel('deepseek-chat')).toBe(true)
    expect(customModels.isCustomModel('unknown-model')).toBe(false)
  })
})

describe('resolveCustomModelApiKey', () => {
  test('reads the apiKeyEnv variable at call time', () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test'
    expect(customModels.resolveCustomModelApiKey(configs[0])).toBe('sk-test')
  })

  test('returns undefined when apiKeyEnv is missing or env is unset', () => {
    expect(customModels.resolveCustomModelApiKey(configs[1])).toBeUndefined()
    process.env.DEEPSEEK_API_KEY = 'sk-test'
    delete configs[0].apiKeyEnv
    expect(customModels.resolveCustomModelApiKey(configs[0])).toBeUndefined()
    configs[0].apiKeyEnv = 'DEEPSEEK_API_KEY'
  })
})

describe('resolveCustomModelAuthToken', () => {
  const tokenConfig = {
    ...configs[0],
    apiKeyEnv: undefined,
    authTokenEnv: 'PROXY_B_TOKEN',
  }

  test('reads the authTokenEnv variable at call time', () => {
    process.env.PROXY_B_TOKEN = 'bearer-token-1'
    expect(customModels.resolveCustomModelAuthToken(tokenConfig)).toBe(
      'bearer-token-1',
    )
  })

  test('returns undefined when authTokenEnv is missing or env is unset', () => {
    expect(customModels.resolveCustomModelAuthToken(configs[1])).toBeUndefined()
    delete process.env.PROXY_B_TOKEN
    expect(
      customModels.resolveCustomModelAuthToken(tokenConfig),
    ).toBeUndefined()
  })
})

describe('getCustomModelProtocol', () => {
  test('honors an explicit protocol', () => {
    expect(customModels.getCustomModelProtocol(configs[0])).toBe('openai')
  })

  test('honors the responses protocol', () => {
    expect(
      customModels.getCustomModelProtocol({
        ...configs[1],
        protocol: 'responses',
      }),
    ).toBe('responses')
  })

  test('falls back to the global provider', () => {
    mockProvider = 'openai'
    expect(customModels.getCustomModelProtocol(configs[1])).toBe('openai')
    mockProvider = 'gemini'
    expect(customModels.getCustomModelProtocol(configs[1])).toBe('gemini')
    mockProvider = 'grok'
    expect(customModels.getCustomModelProtocol(configs[1])).toBe('grok')
  })

  test('defaults unknown global providers to anthropic', () => {
    mockProvider = 'firstParty'
    expect(customModels.getCustomModelProtocol(configs[1])).toBe('anthropic')
    mockProvider = 'bedrock'
    expect(customModels.getCustomModelProtocol(configs[1])).toBe('anthropic')
  })
})
