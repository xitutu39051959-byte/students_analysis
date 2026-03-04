import type { ScoreRecord, StudentSubjectPoint } from '../../../types/domain'
import { sortRecordsByDate } from '../shared/selectors'

export function getStudentTrend(records: ScoreRecord[], student: string, subjectFilter = '全部'): StudentSubjectPoint[] {
  return sortRecordsByDate(
    records.filter((record) => {
      if (record.student !== student) {
        return false
      }
      if (subjectFilter !== '全部' && record.subject !== subjectFilter) {
        return false
      }
      return true
    }),
  ).map((record) => ({
    student: record.student,
    subject: record.subject,
    exam: record.exam,
    examDate: record.examDate,
    score: record.score,
  }))
}
