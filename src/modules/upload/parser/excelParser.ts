import * as XLSX from 'xlsx'
import type { RawTable } from '../../../types/dto'

export async function parseExcel(file: File): Promise<RawTable> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(firstSheet, {
    defval: null,
    raw: false,
  })
  const headers = Object.keys(rows[0] ?? {})

  return { headers, rows }
}
