import type { ExamSummary, ScoreRecord } from '../../../types/domain'
import { round1 } from '../../../utils/number'
import { groupBy } from '../shared/aggregation'
import { sortRecordsByDate } from '../shared/selectors'

export function getExamSummaries(records: ScoreRecord[], examFilter = '全部', subjectFilter = '全部'): ExamSummary[] {
  const filtered = records.filter((record) => {
    if (examFilter !== '全部' && record.exam !== examFilter) {
      return false
    }
    if (subjectFilter !== '全部' && record.subject !== subjectFilter) {
      return false
    }
    return true
  })

  const grouped = groupBy(sortRecordsByDate(filtered), (record) => `${record.exam}__${record.examDate}__${record.subject}`)

  return Object.entries(grouped).map(([key, group]) => {
    const [exam, examDate, subject] = key.split('__')
    const scores = group.map((item) => item.score)
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length

    return {
      exam,
      examDate,
      subject,
      avgScore: round1(avg),
      maxScore: round1(Math.max(...scores)),
      minScore: round1(Math.min(...scores)),
      sampleSize: scores.length,
    }
  })
}

export function getClassOverview(records: ScoreRecord[]): {
  avg: number
  max: number
  min: number
  sampleSize: number
} {
  if (!records.length) {
    return { avg: 0, max: 0, min: 0, sampleSize: 0 }
  }

  const scores = records.map((item) => item.score)
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return {
    avg: round1(avg),
    max: round1(Math.max(...scores)),
    min: round1(Math.min(...scores)),
    sampleSize: records.length,
  }
}
