import pdfParseModule from 'pdf-parse-new'
import * as mammoth from 'mammoth'
import readXlsxFile from 'read-excel-file/node'
import { sanitizeCsvCell } from './csv-sanitize.js'

const pdfParse = pdfParseModule as any

export interface ParsedDocument {
  title: string
  content: string
}

function escapeMdCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
}

function rowsToMarkdown(rows: unknown[][]): string {
  if (rows.length === 0) return ''

  const sanitized = rows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return ''
      if (cell instanceof Date) return sanitizeCsvCell(cell.toISOString()) as string
      return sanitizeCsvCell(String(cell).trim()) as string
    })
  )

  const maxCols = Math.max(...sanitized.map((r) => r.length))
  const normalized = sanitized.map((r) => {
    const padded = [...r]
    while (padded.length < maxCols) padded.push('')
    return padded
  })

  const header = normalized[0].map(escapeMdCell).join(' | ')
  const separator = new Array(maxCols).fill('---').join(' | ')
  const body = normalized.slice(1).map((row) => row.map(escapeMdCell).join(' | '))

  return [header, separator, ...body].join('\n')
}

const EXCEL_MAX_SIZE_BYTES = 10 * 1024 * 1024
const EXCEL_MAX_ROWS = 10_000

export async function parseExcelToRows(buffer: Buffer): Promise<unknown[][]> {
  if (buffer.length > EXCEL_MAX_SIZE_BYTES) {
    throw new Error(`Excel file exceeds maximum size of ${EXCEL_MAX_SIZE_BYTES / 1024 / 1024}MB`)
  }
  const rows = await readXlsxFile(buffer, { trim: true })
  if (rows.length > EXCEL_MAX_ROWS) {
    throw new Error(`Excel file contains too many rows (max ${EXCEL_MAX_ROWS})`)
  }
  return rows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return ''
      if (cell instanceof Date) return sanitizeCsvCell(cell.toISOString()) as string
      return sanitizeCsvCell(String(cell).trim()) as string
    })
  )
}

const DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024

export async function parseDocument(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  if (buffer.length > DOCUMENT_MAX_SIZE_BYTES) {
    throw new Error(`Document exceeds maximum size of ${DOCUMENT_MAX_SIZE_BYTES / 1024 / 1024}MB`)
  }

  const lower = filename.toLowerCase()
  const title = filename.split('.').slice(0, -1).join('.') || filename

  if (lower.endsWith('.pdf')) {
    const pdfData = await pdfParse(buffer)
    return { title, content: (pdfData.text || '').trim() }
  }

  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    const result = await mammoth.extractRawText({ buffer })
    return { title, content: result.value.trim() }
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const rows = await parseExcelToRows(buffer)
    return { title, content: rowsToMarkdown(rows) }
  }

  // Fallback: plain text
  return { title, content: buffer.toString('utf-8').trim() }
}
