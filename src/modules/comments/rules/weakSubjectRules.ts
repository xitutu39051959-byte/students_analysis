import type { AnalysisOptions, ScoreRecord, StudentWeakSubject } from '../../../types/domain'
import { round1 } from '../../../utils/number'
import { listSubjects } from '../../analysis/shared/selectors'

export function findWeakSubjects(
  records: ScoreRecord[],
  student: string,
  currentExam: string,
  options: AnalysisOptions,
): StudentWeakSubject[] {
  const currentExamRecords = records.filter((record) => record.exam === currentExam)
  const studentExamRecords = currentExamRecords.filter((record) => record.student === student)
  const subjects = listSubjects(currentExamRecords)

  return subjects
    .map((subject) => {
      const subjectRecords = currentExamRecords.filter((record) => record.subject === subject)
      const classAvg =
        subjectRecords.reduce((sum, item) => sum + item.score, 0) / (subjectRecords.length || 1)
      const studentRecord = studentExamRecords.find((record) => record.subject === subject)
      if (!studentRecord) {
        return null
      }

      const gap = round1(classAvg - studentRecord.score)
      if (gap < options.weakGapThreshold) {
        return null
      }

      return {
        student,
        subject,
        currentScore: studentRecord.score,
        classAvg: round1(classAvg),
        gapToAvg: gap,
      }
    })
    .filter((item): item is StudentWeakSubject => item !== null)
}
