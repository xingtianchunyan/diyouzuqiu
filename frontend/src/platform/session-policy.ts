import { isStandalonePWA, isIOS, isHarmonyOS, type DetectContext } from './detect'

/**
 * 会话恢复策略
 *
 * 定义页面切后台恢复、登录态自检、401 恢复策略。
 * 当前作为保护带存在，P2 阶段才会实际接入 auth 与 client。
 */

export interface SessionPolicyContext extends DetectContext {
  /** 是否强制启用后台恢复检查 */
  forceCheckOnResume?: boolean
  /** 是否强制启用 401 恢复尝试 */
  forceAttempt401Recovery?: boolean
}

/**
 * 前后台切换时是否触发会话自检。
 */
export function shouldCheckSessionOnResume(ctx?: SessionPolicyContext): boolean {
  if (ctx?.forceCheckOnResume !== undefined) return ctx.forceCheckOnResume
  return isStandalonePWA(ctx) || isIOS(ctx) || isHarmonyOS(ctx)
}

/**
 * PWA 恢复时是否尝试静默刷新会话。
 */
export function shouldSilentRefreshOnResume(ctx?: SessionPolicyContext): boolean {
  return isStandalonePWA(ctx)
}

/**
 * 401 发生时是否先尝试一次恢复，而不是直接登出。
 * 在 PWA 安装态下，直接登出可能导致用户体验不佳。
 */
export function shouldAttempt401Recovery(ctx?: SessionPolicyContext): boolean {
  if (ctx?.forceAttempt401Recovery !== undefined) return ctx.forceAttempt401Recovery
  return isStandalonePWA(ctx)
}

/**
 * 不同接口类型在 401 时的处理策略。
 */
export type EndpointKind = 'login' | 'refresh' | 'resource' | 'media'

export function get401Policy(endpoint: EndpointKind, ctx?: SessionPolicyContext): 'logout' | 'recover-once' | 'ignore' {
  switch (endpoint) {
    case 'login':
      return 'ignore'
    case 'refresh':
      return 'ignore'
    case 'resource':
      return shouldAttempt401Recovery(ctx) ? 'recover-once' : 'logout'
    case 'media':
      return shouldAttempt401Recovery(ctx) ? 'recover-once' : 'logout'
    default:
      throw new Error(`Unknown endpoint kind: ${endpoint}`)
  }
}
