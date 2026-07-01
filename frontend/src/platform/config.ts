/**
 * 平台适配运行时配置
 *
 * 用于控制文件选择策略等适配特性的开关。
 * 默认值保证与当前基线行为一致，可通过 window.__PLATFORM_CONFIG__ 在运行时覆盖。
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
