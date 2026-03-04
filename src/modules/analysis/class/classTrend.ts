import type { ScoreRecord, SubjectTrendPoint } from '../../../types/domain'
import { round1 } from '../../../utils/number'
import { groupBy } from '../shared/aggregation'
import { sortRecordsByDate } from '../shared/selectors'

export function getSubjectTrend(records: ScoreRecord[], subjectFilter = '全部'): SubjectTrendPoint[] {
  const filtered = records.filter((record) => (subjectFilter === '全部' ? true : record.subject === subjectFilter))
  const grouped = groupBy(sortRecordsByDate(filtered), (record) => `${record.subject}__${record.exam}__${record.examDate}`)

  return Object.entries(grouped).map(([key, group]) => {
    const [subject, exam, examDate] = key.split('__')
    const avg = group.reduce((sum, item) => sum + item.score, 0) / group.length
    return {
      subject,
      exam,
      examDate,
      avgScore: round1(avg),
    }
  })
}
