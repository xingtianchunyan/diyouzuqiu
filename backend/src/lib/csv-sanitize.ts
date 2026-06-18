const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n']

/**
 * Sanitize a value that may be exported as a CSV/Excel cell.
 * If the string starts with a formula-triggering character, prefix it with a
 * single quote so spreadsheet applications treat it as plain text.
 */
export function sanitizeCsvCell(value: string | null | undefined): string | null | undefined
export function sanitizeCsvCell(value: unknown): unknown
export function sanitizeCsvCell(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'string') return value
  const trimmed = value.trimStart()
  if (trimmed.length === 0) return value
  const first = trimmed.charAt(0)
  if (DANGEROUS_PREFIXES.includes(first)) {
    return `'${value}`
  }
  return value
}

/**
 * Recursively sanitize all string values in an array of rows.
 */
export function sanitizeCsvRows(rows: unknown[][]): unknown[][] {
  return rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)))
}
