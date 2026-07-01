import { describe, it, expect } from 'vitest'
import { getFilePickerRule, validateFile } from '../file-picker-policy'

describe('file-picker-policy', () => {
  describe('getFilePickerRule', () => {
    it('avatar rule restricts to images', () => {
      const rule = getFilePickerRule('avatar')
      expect(rule.accept).toBe('image/png,image/jpeg,image/webp')
      expect(rule.multiple).toBe(false)
      expect(rule.maxSizeBytes).toBe(5 * 1024 * 1024)
    })

    it('media rule is multiple', () => {
      const rule = getFilePickerRule('media')
      expect(rule.multiple).toBe(true)
    })

    it('knowledgeDoc rule includes common document types', () => {
      const rule = getFilePickerRule('knowledgeDoc')
      expect(rule.extensions).toContain('.pdf')
      expect(rule.extensions).toContain('.docx')
      expect(rule.extensions).toContain('.md')
    })
  })

  describe('validateFile', () => {
    it('accepts valid avatar by extension', () => {
      const rule = getFilePickerRule('avatar')
      const file = new File(['x'], 'avatar.png', { type: 'image/png' })
      expect(validateFile(file, rule)).toBeNull()
    })

    it('rejects invalid avatar type', () => {
      const rule = getFilePickerRule('avatar')
      const file = new File(['x'], 'avatar.gif', { type: 'image/gif' })
      const err = validateFile(file, rule)
      expect(err).not.toBeNull()
      expect(err?.key).toBe('upload.invalidAvatarType')
    })

    it('rejects oversized avatar', () => {
      const rule = getFilePickerRule('avatar')
      const file = new File(['x'.repeat(6 * 1024 * 1024)], 'avatar.png', { type: 'image/png' })
      const err = validateFile(file, rule)
      expect(err?.key).toBe('upload.avatarTooLarge')
    })

    it('accepts valid media by mime wildcard', () => {
      const rule = getFilePickerRule('media')
      const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
      expect(validateFile(file, rule)).toBeNull()
    })
  })
})
