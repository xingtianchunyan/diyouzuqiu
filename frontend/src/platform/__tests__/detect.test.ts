import { describe, it, expect } from 'vitest'
import {
  isIOS,
  isAndroid,
  isHarmonyOS,
  isStandalonePWA,
  isLikelyWebView,
  getPlatformLabel
} from '../detect'

describe('detect', () => {
  describe('isIOS', () => {
    it('returns true for iPhone Safari', () => {
      expect(isIOS({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(true)
    })

    it('returns false for Android Chrome', () => {
      expect(isIOS({ ua: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(false)
    })
  })

  describe('isAndroid', () => {
    it('returns true for Android Chrome', () => {
      expect(isAndroid({ ua: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(true)
    })

    it('returns false for HarmonyOS', () => {
      expect(isAndroid({ ua: 'Mozilla/5.0 (HarmonyOS; Phone; HarmonyOS 4.0)' })).toBe(false)
    })
  })

  describe('isHarmonyOS', () => {
    it('returns true for HarmonyOS UA', () => {
      expect(isHarmonyOS({ ua: 'Mozilla/5.0 (HarmonyOS; Phone; HarmonyOS 4.0)' })).toBe(true)
    })

    it('returns false for Android UA', () => {
      expect(isHarmonyOS({ ua: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(false)
    })
  })

  describe('isStandalonePWA', () => {
    it('returns true when standalone flag is set', () => {
      expect(isStandalonePWA({ standalone: true })).toBe(true)
    })

    it('returns false in browser context', () => {
      expect(isStandalonePWA({ displayMode: 'browser' })).toBe(false)
    })
  })

  describe('isLikelyWebView', () => {
    it('returns true for WeChat WebView', () => {
      expect(isLikelyWebView({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0' })).toBe(true)
    })

    it('returns false for Safari', () => {
      expect(isLikelyWebView({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' })).toBe(false)
    })
  })

  describe('getPlatformLabel', () => {
    it('labels HarmonyOS correctly', () => {
      expect(getPlatformLabel({ ua: 'HarmonyOS' })).toBe('harmonyos')
    })

    it('labels iOS correctly', () => {
      expect(getPlatformLabel({ ua: 'iPhone' })).toBe('ios')
    })

    it('labels Android correctly', () => {
      expect(getPlatformLabel({ ua: 'Android' })).toBe('android')
    })
  })
})
