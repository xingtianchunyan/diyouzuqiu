/**
 * 平台与环境检测
 *
 * 所有检测函数都设计为纯函数（接收可选的 ua / context 参数），便于单元测试。
 * 业务代码不应直接使用这些布尔值做分支，而应通过 capabilities.ts 输出做决策。
 */

export interface DetectContext {
  ua?: string
  displayMode?: string
  standalone?: boolean
}

function getUA(ctx?: DetectContext): string {
  return (ctx?.ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')).toLowerCase()
}

export function isIOS(ctx?: DetectContext): boolean {
  const ua = getUA(ctx)
  return /iphone|ipad|ipod/.test(ua)
}

export function isAndroid(ctx?: DetectContext): boolean {
  const ua = getUA(ctx)
  return /android/.test(ua) && !/harmonyos/.test(ua)
}

export function isHarmonyOS(ctx?: DetectContext): boolean {
  const ua = getUA(ctx)
  // 鸿蒙 UA 常见关键字：harmonyos、openharmony
  // 注意：部分 HarmonyOS 版本 UA 同时包含 Android，需要优先判断 harmonyos
  return /harmonyos|openharmony/.test(ua)
}

export function isStandalonePWA(ctx?: DetectContext): boolean {
  if (ctx?.standalone !== undefined) return ctx.standalone
  if (ctx?.displayMode) return ctx.displayMode === 'standalone' || ctx.displayMode === 'fullscreen'

  if (typeof window === 'undefined') return false

  // 标准 PWA 检测
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari 添加到主屏幕
  if ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true) return true

  return false
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function isFinePointer(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(pointer: fine)').matches
}

export function isLikelyWebView(ctx?: DetectContext): boolean {
  const ua = getUA(ctx)
  // 常见 WebView / 内置浏览器特征
  return /micromessenger|wechat|qqbrowser|ucbrowser|baidu|sougou|360se|2345|qbwebview/.test(ua)
}

/**
 * 当前运行平台标签，仅用于日志/统计，不做业务分支。
 */
export type PlatformLabel = 'ios' | 'android' | 'harmonyos' | 'desktop' | 'unknown'

export function getPlatformLabel(ctx?: DetectContext): PlatformLabel {
  if (isHarmonyOS(ctx)) return 'harmonyos'
  if (isIOS(ctx)) return 'ios'
  if (isAndroid(ctx)) return 'android'
  if (typeof window !== 'undefined' && !isTouchDevice()) return 'desktop'
  return 'unknown'
}
