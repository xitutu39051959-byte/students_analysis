import * as XLSX from 'xlsx'
import type { RawTable } from '../../../types/dto'

function decodeCsv(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  if (!utf8.includes('�')) {
    return utf8
  }

  try {
    return new TextDecoder('gbk').decode(bytes)
  } catch {
    return utf8
  }
}

export async function parseCsv(file: File): Promise<RawTable> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const content = decodeCsv(bytes)

  const workbook = XLSX.read(content, { type: 'string' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(firstSheet, {
    defval: null,
    raw: false,
  })

  const headers = Object.keys(rows[0] ?? {})
  return { headers, rows }
}
