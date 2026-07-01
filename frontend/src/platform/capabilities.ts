import { isIOS, isHarmonyOS, isStandalonePWA, isTouchDevice, isFinePointer, type DetectContext } from './detect'
import { getPlatformConfig } from './config'

/**
 * 能力层
 *
 * 把平台检测结果映射为业务可用的能力开关。
 * 业务代码应只依赖这里输出的能力，不直接依赖 detect.ts 的原始判断。
 */

export interface CapabilityContext extends DetectContext {
  /** 强制覆盖是否使用具体 MIME 列表 */
  explicitMimeListOverride?: boolean
  /** 强制禁用鸿蒙文件选择器特化策略 */
  disableHarmonyPickerPolicy?: boolean
}

/**
 * 是否建议启用拖拽上传。
 * 触屏设备或没有精细指针的设备通常不适合拖拽。
 */
export function shouldEnableDragDrop(_ctx?: CapabilityContext): boolean {
  return isFinePointer() && !isTouchDevice()
}

/**
 * 是否建议使用具体 MIME 列表（而非宽泛的 image/* / video/*）。
 * HarmonyOS 与部分 iOS WebView 对宽泛 accept 支持不稳定。
 */
export function shouldUseExplicitMimeList(_scenario: string, ctx?: CapabilityContext): boolean {
  if (ctx?.explicitMimeListOverride !== undefined) return ctx.explicitMimeListOverride

  const config = getPlatformConfig()
  if (config.useExplicitMobileMediaAcceptList) return true

  if (ctx?.disableHarmonyPickerPolicy) return false
  if (!config.enableHarmonyMediaPickerPolicy) return false

  return isHarmonyOS(ctx) || isLikelyProblematicWebView(ctx)
}

/**
 * 是否应对受保护媒体资源禁用缓存。
 * iOS / HarmonyOS 在 PWA 场景下容易缓存 401/403 响应。
 */
export function shouldDisableMediaCache(ctx?: CapabilityContext): boolean {
  return isStandalonePWA(ctx) || isIOS(ctx) || isHarmonyOS(ctx)
}

/**
 * 是否应对上传错误显示更详细的平台相关提示。
 */
export function shouldShowPlatformSpecificUploadHint(ctx?: CapabilityContext): boolean {
  return isHarmonyOS(ctx) || isLikelyProblematicWebView(ctx)
}

function isLikelyProblematicWebView(ctx?: CapabilityContext): boolean {
  const ua = (ctx?.ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')).toLowerCase()
  return /micromessenger|wechat|qqbrowser|ucbrowser/.test(ua)
}
