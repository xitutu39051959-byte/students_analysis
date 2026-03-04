import type { ImportContext, ParseResult } from '../../../types/dto'
import type { ScoreRecordRaw } from '../../../types/domain'
import { toIsoDate } from '../../../utils/date'
import { toNumber } from '../../../utils/number'
import { normalizeText } from '../../../utils/text'

export function validateAndNormalize(
  rows: Array<Record<string, string | number | null>>,
  mapping: Record<string, string>,
  context: ImportContext,
): ParseResult {
  const errors: ParseResult['errors'] = []
  const warnings: ParseResult['warnings'] = []
  const previewRows: ScoreRecordRaw[] = []

  const indexedRecords = new Map<string, { row: number; record: ParseResult['validRecords'][number] }>()
  let duplicateRows = 0

  rows.forEach((row, index) => {
    const rowNumber = index + 2

    const student = normalizeText(row[mapping['学生']])
    const exam = normalizeText(row[mapping['考试']])
    const subject = normalizeText(row[mapping['科目']])
    const examDateRaw = normalizeText(row[mapping['考试日期']])
    const scoreRaw = row[mapping['分数']] ?? null

    previewRows.push({ student, exam, subject, score: scoreRaw, examDate: examDateRaw })

    if (!student) {
      errors.push({ row: rowNumber, field: '学生', message: '学生不能为空' })
      return
    }
    if (!exam) {
      errors.push({ row: rowNumber, field: '考试', message: '考试不能为空' })
      return
    }
    if (!subject) {
      errors.push({ row: rowNumber, field: '科目', message: '科目不能为空' })
      return
    }

    const isoDate = toIsoDate(examDateRaw)
    if (!isoDate) {
      errors.push({ row: rowNumber, field: '考试日期', message: '考试日期格式无效' })
      return
    }

    const score = toNumber(scoreRaw)
    if (score === null) {
      warnings.push({ row: rowNumber, field: '分数', message: '分数为空或非数值，已忽略该行' })
      return
    }
    if (score < 0 || score > 100) {
      errors.push({ row: rowNumber, field: '分数', message: '分数必须在 0-100 之间' })
      return
    }

    const className = normalizeText(row[mapping['班级']]) || context.className
    const term = normalizeText(row[mapping['学期']]) || context.term

    const record = {
      student,
      exam,
      subject,
      score,
      examDate: isoDate,
      className,
      term,
    }

    const uniqueKey = `${student}__${exam}__${isoDate}__${subject}`
    if (indexedRecords.has(uniqueKey)) {
      duplicateRows += 1
      warnings.push({ row: rowNumber, field: '重复', message: '检测到重复记录，已保留最后一条' })
    }

    indexedRecords.set(uniqueKey, { row: rowNumber, record })
  })

  const validRecords = [...indexedRecords.values()].map((item) => item.record)

  return {
    validRecords,
    errors,
    warnings,
    previewRows,
    mapping,
    summary: {
      totalRows: rows.length,
      successRows: validRecords.length,
      failedRows: errors.length,
      duplicateRows,
    },
  }
}
