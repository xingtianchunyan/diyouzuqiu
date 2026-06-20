const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
}

/**
 * Recursively escape HTML in all string fields of a JSON-serializable value.
 * Dates are left as-is (they serialize to ISO strings naturally).
 */
export function deepEscapeHtml<T>(value: T): T {
  if (typeof value === 'string') {
    return escapeHtml(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepEscapeHtml(item)) as unknown as T
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepEscapeHtml(val)
    }
    return result as unknown as T
  }
  return value
}
