import { describe, it, expect } from 'vitest'
import { escapeHtml, deepEscapeHtml } from '../src/lib/xss.js'

describe('XSS output filtering', () => {
  it('escapeHtml encodes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(escapeHtml("'")).toBe('&#39;')
    expect(escapeHtml('&')).toBe('&amp;')
  })

  it('deepEscapeHtml recursively escapes string fields', () => {
    const input = {
      id: '1',
      name: '<b>name</b>',
      nested: { value: '<script>' },
      list: ['<a>', { title: '&' }],
      count: 42,
      active: true,
      date: new Date('2024-01-01T00:00:00.000Z')
    }
    const out = deepEscapeHtml(input)
    expect(out.name).toBe('&lt;b&gt;name&lt;/b&gt;')
    expect(out.nested.value).toBe('&lt;script&gt;')
    expect(out.list[0]).toBe('&lt;a&gt;')
    expect((out.list[1] as any).title).toBe('&amp;')
    expect(out.count).toBe(42)
    expect(out.active).toBe(true)
    expect(out.date).toBeInstanceOf(Date)
  })
})
