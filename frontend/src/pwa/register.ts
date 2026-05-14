import { registerSW } from 'virtual:pwa-register'

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return
  
  registerSW({ immediate: true })
}

