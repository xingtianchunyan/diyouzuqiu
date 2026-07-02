/**
 * 平台适配运行时配置
 *
 * 用于控制文件选择策略等适配特性的开关。
 * 默认值保证与当前基线行为一致，可通过以下方式覆盖（优先级从低到高）：
 * 1. 默认值
 * 2. URL 查询参数（仅开发/测试环境）
 * 3. window.__PLATFORM_CONFIG__ 注入
 * 4. setPlatformConfig 运行时覆盖
 */

let runtimeOverride: Partial<PlatformConfig> = {}

export interface PlatformConfig {
  /**
   * 是否始终使用具体 MIME 列表（而非 image/* / video/*）。
   * 开启后对所有平台生效，主要用于验证阶段或回滚对比。
   */
  useExplicitMobileMediaAcceptList: boolean

  /**
   * 是否启用鸿蒙文件选择器特化策略。
   * 关闭后鸿蒙将按普通 Android 处理，便于问题定位。
   */
  enableHarmonyMediaPickerPolicy: boolean
}

const defaultConfig: PlatformConfig = {
  useExplicitMobileMediaAcceptList: false,
  enableHarmonyMediaPickerPolicy: true
}

function parseBool(value: string | null): boolean | undefined {
  if (value === null || value === '') return undefined
  return value === '1' || value === 'true' || value === 'yes'
}

function getUrlConfig(): Partial<PlatformConfig> {
  // 生产环境不读取 URL 参数，避免用户误触开关
  if (typeof window === 'undefined') return {}
  if (import.meta.env.PROD) return {}

  const params = new URLSearchParams(window.location.search)
  return {
    useExplicitMobileMediaAcceptList: parseBool(params.get('explicitMime')),
    enableHarmonyMediaPickerPolicy: parseBool(params.get('harmonyPolicy'))
  }
}

function getWindowConfig(): Partial<PlatformConfig> {
  try {
    const target = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined
    const injected = target?.__PLATFORM_CONFIG__
    if (injected && typeof injected === 'object') {
      return injected as Partial<PlatformConfig>
    }
  } catch {
    // ignore
  }
  return {}
}

export function getPlatformConfig(): PlatformConfig {
  return {
    ...defaultConfig,
    ...getUrlConfig(),
    ...getWindowConfig(),
    ...runtimeOverride
  }
}

/**
 * 临时覆盖配置（仅用于测试或在运行窗口加载后动态调整）。
 */
export function setPlatformConfig(override: Partial<PlatformConfig>): void {
  runtimeOverride = { ...runtimeOverride, ...override }

  try {
    const target = (typeof window !== 'undefined' ? window : {}) as Record<string, unknown>
    target.__PLATFORM_CONFIG__ = {
      ...getPlatformConfig(),
      ...override
    }
  } catch {
    // ignore
  }
}

/**
 * 重置所有运行时覆盖（仅用于测试）。
 */
export function resetPlatformConfig(): void {
  runtimeOverride = {}
}
