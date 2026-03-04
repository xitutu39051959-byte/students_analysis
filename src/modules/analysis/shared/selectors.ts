import type { ScoreRecord } from '../../../types/domain'
import { compareIsoDate } from '../../../utils/date'
import { unique } from '../../../utils/text'

export function sortRecordsByDate(records: ScoreRecord[]): ScoreRecord[] {
  return [...records].sort((a, b) => {
    const dateCmp = compareIsoDate(a.examDate, b.examDate)
    if (dateCmp !== 0) {
      return dateCmp
    }
    return a.exam.localeCompare(b.exam)
  })
}

export function listExams(records: ScoreRecord[]): Array<{ exam: string; examDate: string }> {
  const seen = new Set<string>()
  const ordered = sortRecordsByDate(records)

  const result: Array<{ exam: string; examDate: string }> = []
  for (const item of ordered) {
    const key = `${item.exam}__${item.examDate}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push({ exam: item.exam, examDate: item.examDate })
  }
  return result
}

export function listSubjects(records: ScoreRecord[]): string[] {
  return unique(records.map((record) => record.subject)).sort((a, b) => a.localeCompare(b))
}

export function listStudents(records: ScoreRecord[]): string[] {
  return unique(records.map((record) => record.student)).sort((a, b) => a.localeCompare(b))
}
