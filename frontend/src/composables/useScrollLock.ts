import { onUnmounted, watch, type Ref } from 'vue'

/**
 * Locks body scroll while an overlay (lightbox / modal) is open.
 *
 * iOS Safari ignores `overflow: hidden` on body, so we freeze the body with
 * `position: fixed` and restore the exact scroll position on release.
 * A module-level refcount keeps nested/concurrent overlays safe: the body is
 * only restored after the last consumer releases the lock.
 */

let lockCount = 0
let savedScrollY = 0

const acquire = () => {
  if (lockCount > 0) {
    lockCount += 1
    return
  }
  lockCount = 1
  savedScrollY = window.scrollY || window.pageYOffset || 0
  const body = document.body
  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.overflow = 'hidden'
  body.style.width = '100%'
}

const release = () => {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0) return
  const body = document.body
  body.style.position = ''
  body.style.top = ''
  body.style.left = ''
  body.style.right = ''
  body.style.overflow = ''
  body.style.width = ''
  window.scrollTo(0, savedScrollY)
}

/**
 * Watches `locked`; body scroll is frozen while it is true and restored
 * (including scroll position) when it becomes false or the component
 * unmounts.
 */
export function useScrollLock(locked: Ref<boolean>) {
  watch(
    locked,
    (isLocked) => {
      if (isLocked) acquire()
      else release()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (locked.value) release()
  })
}
