import type { ScoreRecord, ScoreRecordRaw } from './domain'

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface ImportWarning {
  row: number
  field: string
  message: string
}

export interface ImportSummary {
  totalRows: number
  successRows: number
  failedRows: number
  duplicateRows: number
}

export interface ParseResult {
  validRecords: ScoreRecord[]
  errors: ImportError[]
  warnings: ImportWarning[]
  summary: ImportSummary
  mapping: Record<string, string>
  previewRows: ScoreRecordRaw[]
}

export interface RawTable {
  headers: string[]
  rows: Array<Record<string, string | number | null>>
}

export interface ImportContext {
  className: string
  term: string
}
