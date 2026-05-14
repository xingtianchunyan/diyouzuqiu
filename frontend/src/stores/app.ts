import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    locale: 'zh-CN' as 'zh-CN' | 'en',
  }),
  actions: {
    setLocale(locale: 'zh-CN' | 'en') {
      this.locale = locale
    },
    toggleLocale() {
      this.locale = this.locale === 'zh-CN' ? 'en' : 'zh-CN'
    },
  },
})

