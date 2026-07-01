import { describe, it, expect } from 'vitest'
import { shouldUseExplicitMimeList, shouldDisableMediaCache } from '../capabilities'
import { setPlatformConfig } from '../config'

describe('capabilities', () => {
  describe('shouldUseExplicitMimeList', () => {
    it('returns true for HarmonyOS by default', () => {
      expect(shouldUseExplicitMimeList('media', { ua: 'HarmonyOS 4.0' })).toBe(true)
    })

    it('returns true for WeChat WebView by default', () => {
      expect(shouldUseExplicitMimeList('media', { ua: 'MicroMessenger/8.0' })).toBe(true)
    })

    it('returns false for desktop Safari by default', () => {
      expect(shouldUseExplicitMimeList('media', { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' })).toBe(false)
    })

    it('can be overridden per call', () => {
      expect(shouldUseExplicitMimeList('media', { ua: 'Android', explicitMimeListOverride: true })).toBe(true)
      expect(shouldUseExplicitMimeList('media', { ua: 'HarmonyOS', explicitMimeListOverride: false })).toBe(false)
    })

    it('respects global useExplicitMobileMediaAcceptList flag', () => {
      setPlatformConfig({ useExplicitMobileMediaAcceptList: true })
      expect(shouldUseExplicitMimeList('media', { ua: 'Mozilla/5.0 (Macintosh)' })).toBe(true)
      setPlatformConfig({ useExplicitMobileMediaAcceptList: false })
      expect(shouldUseExplicitMimeList('media', { ua: 'Mozilla/5.0 (Macintosh)' })).toBe(false)
    })

    it('can disable HarmonyOS policy via disableHarmonyPickerPolicy', () => {
      expect(shouldUseExplicitMimeList('media', { ua: 'HarmonyOS', disableHarmonyPickerPolicy: true })).toBe(false)
    })
  })

  describe('shouldDisableMediaCache', () => {
    it('returns true for PWA standalone', () => {
      expect(shouldDisableMediaCache({ standalone: true })).toBe(true)
    })

    it('returns true for iOS', () => {
      expect(shouldDisableMediaCache({ ua: 'iPhone' })).toBe(true)
    })

    it('returns false for generic desktop', () => {
      expect(shouldDisableMediaCache({ ua: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe(false)
    })
  })
})
