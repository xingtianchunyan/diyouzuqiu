import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPlatformConfig, setPlatformConfig, resetPlatformConfig } from '../config'

describe('config', () => {
  beforeEach(() => {
    resetPlatformConfig()
  })

  afterEach(() => {
    resetPlatformConfig()
  })

  it('returns default config', () => {
    const config = getPlatformConfig()
    expect(config.useExplicitMobileMediaAcceptList).toBe(false)
    expect(config.enableHarmonyMediaPickerPolicy).toBe(true)
  })

  it('applies runtime override', () => {
    setPlatformConfig({ useExplicitMobileMediaAcceptList: true })
    expect(getPlatformConfig().useExplicitMobileMediaAcceptList).toBe(true)
  })

  it('reset clears runtime override', () => {
    setPlatformConfig({ useExplicitMobileMediaAcceptList: true })
    resetPlatformConfig()
    expect(getPlatformConfig().useExplicitMobileMediaAcceptList).toBe(false)
  })
})
