import type { ScoreRecord, StudentComparison } from '../../../types/domain'
import { compareIsoDate } from '../../../utils/date'
import { round1 } from '../../../utils/number'
import { listExams, listSubjects } from '../shared/selectors'

export function getStudentComparison(
  records: ScoreRecord[],
  student: string,
  currentExamName: string,
): StudentComparison[] {
  const studentRecords = records.filter((record) => record.student === student)
  const exams = listExams(studentRecords)
  if (!exams.length) {
    return []
  }

  const current = exams.find((exam) => exam.exam === currentExamName) ?? exams[exams.length - 1]
  const previousCandidates = exams.filter((exam) => compareIsoDate(exam.examDate, current.examDate) < 0)
  const previous = previousCandidates[previousCandidates.length - 1]

  const subjects = listSubjects(studentRecords)

  return subjects.map((subject) => {
    const currentRecord = studentRecords.find(
      (record) => record.subject === subject && record.exam === current.exam && record.examDate === current.examDate,
    )
    const previousRecord = previous
      ? studentRecords.find(
          (record) => record.subject === subject && record.exam === previous.exam && record.examDate === previous.examDate,
        )
      : undefined

    const currentScore = currentRecord?.score ?? null
    const previousScore = previousRecord?.score ?? null
    const delta =
      currentScore === null || previousScore === null ? null : round1(currentScore - previousScore)

    return {
      student,
      subject,
      currentExam: current.exam,
      previousExam: previous?.exam ?? '无',
      currentScore,
      previousScore,
      delta,
    }
  })
}
