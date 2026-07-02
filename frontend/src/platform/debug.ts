import { getPlatformConfig, setPlatformConfig, resetPlatformConfig } from './config'
import { getPlatformLabel, isStandalonePWA, isIOS, isAndroid, isHarmonyOS, isLikelyWebView } from './detect'
import { shouldUseExplicitMimeList, shouldEnableDragDrop, shouldDisableMediaCache } from './capabilities'
import { shouldCheckSessionOnResume } from './session-policy'
import { getFilePickerRule } from './file-picker-policy'

/**
 * 平台适配调试工具
 *
 * 在浏览器控制台执行 `platformDebug.log()` 可查看当前平台状态与配置。
 */

export interface PlatformDebugSnapshot {
  platform: string
  isIOS: boolean
  isAndroid: boolean
  isHarmonyOS: boolean
  isStandalonePWA: boolean
  isLikelyWebView: boolean
  config: ReturnType<typeof getPlatformConfig>
  capabilities: {
    shouldEnableDragDrop: boolean
    shouldUseExplicitMimeListForMedia: boolean
    shouldCheckSessionOnResume: boolean
    shouldDisableMediaCache: boolean
  }
  filePickerRules: {
    media: string
    chronicleAttachment: string
    avatar: string
    knowledgeDoc: string
  }
}

export function getPlatformDebugSnapshot(): PlatformDebugSnapshot {
  return {
    platform: getPlatformLabel(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isHarmonyOS: isHarmonyOS(),
    isStandalonePWA: isStandalonePWA(),
    isLikelyWebView: isLikelyWebView(),
    config: getPlatformConfig(),
    capabilities: {
      shouldEnableDragDrop: shouldEnableDragDrop(),
      shouldUseExplicitMimeListForMedia: shouldUseExplicitMimeList('media'),
      shouldCheckSessionOnResume: shouldCheckSessionOnResume(),
      shouldDisableMediaCache: shouldDisableMediaCache()
    },
    filePickerRules: {
      media: getFilePickerRule('media').accept,
      chronicleAttachment: getFilePickerRule('chronicleAttachment').accept,
      avatar: getFilePickerRule('avatar').accept,
      knowledgeDoc: getFilePickerRule('knowledgeDoc').accept
    }
  }
}

export function logPlatformState(): void {
  if (typeof window === 'undefined') return
  // eslint-disable-next-line no-console
  console.table(getPlatformDebugSnapshot())
}

export function enableExplicitMimeForTesting(): void {
  setPlatformConfig({ useExplicitMobileMediaAcceptList: true })
}

export function disableHarmonyPickerPolicyForTesting(): void {
  setPlatformConfig({ enableHarmonyMediaPickerPolicy: false })
}

export function resetPlatformStateForTesting(): void {
  resetPlatformConfig()
}

/**
 * 将调试工具挂载到 window，便于在浏览器控制台直接调用。
 * 仅在开发/测试环境自动挂载。
 */
export function installPlatformDebug(): void {
  if (typeof window === 'undefined') return
  if (import.meta.env.PROD) return

  const target = window as unknown as Record<string, unknown>
  target.platformDebug = {
    log: logPlatformState,
    snapshot: getPlatformDebugSnapshot,
    enableExplicitMime: enableExplicitMimeForTesting,
    disableHarmonyPolicy: disableHarmonyPickerPolicyForTesting,
    reset: resetPlatformStateForTesting
  }
}
