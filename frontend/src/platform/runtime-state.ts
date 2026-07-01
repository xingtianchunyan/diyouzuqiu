import { ref, readonly, onMounted, onUnmounted, type Ref } from 'vue'
import { isStandalonePWA } from './detect'
import { shouldCheckSessionOnResume } from './session-policy'

/**
 * 运行时状态
 *
 * 管理浏览器态 / 安装态、前后台切换、网络离线/重连等运行时状态。
 * 以可组合的函数形式提供，不依赖 Pinia。
 */

export interface PlatformRuntimeState {
  isBrowser: boolean
  isStandalone: boolean
  isOnline: boolean
  isVisible: boolean
  justResumed: boolean
}

const globalState: Ref<PlatformRuntimeState> = ref({
  isBrowser: typeof window !== 'undefined' && !isStandalonePWA(),
  isStandalone: isStandalonePWA(),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isVisible: typeof document !== 'undefined' ? !document.hidden : true,
  justResumed: false
})

let initialized = false
const listeners = new Set<(state: Readonly<PlatformRuntimeState>) => void>()

function notify() {
  listeners.forEach(cb => cb(readonly(globalState.value)))
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return
  const wasHidden = !globalState.value.isVisible
  globalState.value.isVisible = !document.hidden

  if (wasHidden && globalState.value.isVisible) {
    globalState.value.justResumed = true
    notify()
    // 短暂标记后清除，便于业务方做一次恢复检查
    window.setTimeout(() => {
      globalState.value.justResumed = false
      notify()
    }, 100)
  } else {
    notify()
  }
}

function handleOnline() {
  globalState.value.isOnline = true
  notify()
}

function handleOffline() {
  globalState.value.isOnline = false
  notify()
}

function handlePageShow(event: PageTransitionEvent) {
  // pageshow 的 persisted 为 true 表示从 bfcache 恢复
  if (event.persisted) {
    globalState.value.justResumed = true
    notify()
    window.setTimeout(() => {
      globalState.value.justResumed = false
      notify()
    }, 100)
  }
}

function init() {
  if (initialized) return
  if (typeof window === 'undefined') return

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('pageshow', handlePageShow)

  initialized = true
}

function teardown() {
  if (!initialized) return
  if (typeof window === 'undefined') return

  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('pageshow', handlePageShow)

  initialized = false
}

/**
 * 组件内使用的 composable。
 * 会自动挂载全局监听；组件卸载时不会真正移除监听（避免多组件竞争），
 * 仅当最后一个订阅者离开后才考虑 teardown。
 */
export function usePlatformRuntimeState(
  onResume?: () => void
): Readonly<Ref<PlatformRuntimeState>> {
  init()

  const callback = (state: Readonly<PlatformRuntimeState>) => {
    if (state.justResumed && onResume) {
      onResume()
    }
  }

  onMounted(() => {
    listeners.add(callback)
    callback(readonly(globalState.value))
  })

  onUnmounted(() => {
    listeners.delete(callback)
    if (listeners.size === 0) {
      teardown()
    }
  })

  return readonly(globalState)
}

/**
 * 是否需要监听 resume 事件以触发会话检查。
 */
export function shouldWatchResume(): boolean {
  return shouldCheckSessionOnResume()
}

export { readonly, globalState }
