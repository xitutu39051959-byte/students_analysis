import type { AnalysisOptions, ScoreRecord, StudentComment } from '../../../types/domain'
import { listStudents } from '../../analysis/shared/selectors'

interface ExamRef {
  exam: string
  examDate: string
}

function uniqueExams(records: ScoreRecord[]): ExamRef[] {
  const seen = new Set<string>()
  const sorted = [...records].sort((a, b) => {
    const dateCmp = a.examDate.localeCompare(b.examDate)
    if (dateCmp !== 0) {
      return dateCmp
    }
    return a.exam.localeCompare(b.exam)
  })

  const exams: ExamRef[] = []
  for (const record of sorted) {
    const key = `${record.exam}__${record.examDate}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    exams.push({ exam: record.exam, examDate: record.examDate })
  }
  return exams
}

function averageScore(records: ScoreRecord[]): number {
  if (!records.length) {
    return 0
  }
  return records.reduce((sum, item) => sum + item.score, 0) / records.length
}

function buildSubjectSuggestion(subject: string): string {
  return `建议重点加强${subject}基础题训练，整理错题并进行每周复盘。`
}

function buildCommentText(params: {
  trend: StudentComment['overallTrend']
  latestAvg: number
  previousAvg: number | null
  lowestSubject: string | null
  lowestScore: number | null
}): string {
  const trendText =
    params.trend === 'up'
      ? `最近一次考试较上一次有进步（均分 ${params.previousAvg?.toFixed(1)} -> ${params.latestAvg.toFixed(1)}），值得表扬。`
      : params.trend === 'down'
        ? `最近一次考试较上一次有所下降（均分 ${params.previousAvg?.toFixed(1)} -> ${params.latestAvg.toFixed(1)}），需要注意学习状态。`
        : params.trend === 'flat'
          ? `最近两次考试成绩基本持平（均分 ${params.latestAvg.toFixed(1)}），建议继续稳步提升。`
          : '当前缺少上一次考试数据，暂无法判断升降趋势。'

  if (!params.lowestSubject || params.lowestScore === null) {
    return `${trendText}当前没有可用的科目分数用于生成学习建议。`
  }

  return `${trendText}本次最低分科目是${params.lowestSubject}（${params.lowestScore.toFixed(1)}分），建议优先补强该科目。`
}

export function generateStudentComments(
  records: ScoreRecord[],
  _options: AnalysisOptions,
  targetStudent?: string,
): StudentComment[] {
  const students = targetStudent ? [targetStudent] : listStudents(records)

  return students.map((student) => {
    const studentRecords = records.filter((record) => record.student === student)
    const exams = uniqueExams(studentRecords)
    const latestExam = exams[exams.length - 1]
    const previousExam = exams.length > 1 ? exams[exams.length - 2] : null

    const latestRecords = latestExam
      ? studentRecords.filter((record) => record.exam === latestExam.exam && record.examDate === latestExam.examDate)
      : []

    const previousRecords = previousExam
      ? studentRecords.filter((record) => record.exam === previousExam.exam && record.examDate === previousExam.examDate)
      : []

    const latestAvg = averageScore(latestRecords)
    const previousAvg = previousRecords.length ? averageScore(previousRecords) : null

    const trend: StudentComment['overallTrend'] =
      previousAvg === null
        ? 'insufficient_data'
        : latestAvg > previousAvg
          ? 'up'
          : latestAvg < previousAvg
            ? 'down'
            : 'flat'

    const lowestRecord = [...latestRecords].sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score
      }
      return a.subject.localeCompare(b.subject)
    })[0]

    const lowestSubject = lowestRecord?.subject ?? null
    const lowestScore = lowestRecord?.score ?? null
    const suggestions = lowestSubject ? [buildSubjectSuggestion(lowestSubject)] : ['建议继续保持当前学习状态。']

    return {
      student,
      overallTrend: trend,
      weakSubjects: lowestSubject ? [lowestSubject] : [],
      strengthSubjects: [],
      commentText: buildCommentText({ trend, latestAvg, previousAvg, lowestSubject, lowestScore }),
      suggestions,
    }
  })
}
