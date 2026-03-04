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

function pickVariant(student: string, latestAvg: number): number {
  const base = `${student}-${latestAvg.toFixed(1)}`
  let hash = 0
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) % 997
  }
  return hash % 3
}

function buildSubjectSuggestion(subject: string, variant: number): string {
  const templates = [
    `建议重点加强${subject}基础题训练，整理错题并进行每周复盘。`,
    `建议围绕${subject}建立“错题-同类题-变式题”训练链，提升解题稳定性。`,
    `建议把${subject}拆分为薄弱知识点清单，每周完成一次针对性巩固。`,
  ]
  return templates[variant % templates.length]
}

function buildCommentText(params: {
  student: string
  trend: StudentComment['overallTrend']
  latestAvg: number
  previousAvg: number | null
  lowestSubject: string | null
  lowestScore: number | null
  delta: number | null
  variant: number
}): string {
  const v = params.variant % 3

  const upTemplates = [
    `${params.student}最近一次考试较上一次有明显进步（均分 ${params.previousAvg?.toFixed(1)} -> ${params.latestAvg.toFixed(1)}），学习投入值得肯定。`,
    `${params.student}本轮成绩呈上升趋势（提升 ${params.delta?.toFixed(1)} 分），状态积极，建议继续保持。`,
    `${params.student}在最近两次考试中实现提升（均分提高到 ${params.latestAvg.toFixed(1)}），体现了较好的调整能力。`,
  ]
  const downTemplates = [
    `${params.student}最近一次考试较上一次有所回落（均分 ${params.previousAvg?.toFixed(1)} -> ${params.latestAvg.toFixed(1)}），建议及时调整学习节奏。`,
    `${params.student}本轮成绩下降 ${Math.abs(params.delta ?? 0).toFixed(1)} 分，需要重点关注学习效率与复习质量。`,
    `${params.student}近期成绩出现波动，较上一次有下降，建议从作业质量和错题复盘两个方面加强。`,
  ]
  const flatTemplates = [
    `${params.student}最近两次考试成绩整体持平（均分约 ${params.latestAvg.toFixed(1)}），基础较稳定。`,
    `${params.student}成绩保持稳定，建议在薄弱环节上寻求突破，进一步提高总分。`,
    `${params.student}当前成绩波动较小，可继续巩固优势，同时针对短板科目发力。`,
  ]
  const insufficientTemplates = [
    `${params.student}当前缺少可比对的上一次考试数据，暂无法判断趋势。`,
    `${params.student}目前数据不足，建议后续结合阶段性考试持续跟踪。`,
    `${params.student}由于历史数据不完整，暂以本次成绩为主要参考。`,
  ]

  const trendText =
    params.trend === 'up'
      ? upTemplates[v]
      : params.trend === 'down'
        ? downTemplates[v]
        : params.trend === 'flat'
          ? flatTemplates[v]
          : insufficientTemplates[v]

  if (!params.lowestSubject || params.lowestScore === null) {
    return `${trendText}当前没有可用的科目分数用于生成学习建议。`
  }

  const focusTemplates = [
    `本次最低分科目是${params.lowestSubject}（${params.lowestScore.toFixed(1)}分），建议优先补强该科目。`,
    `从科目表现看，${params.lowestSubject}（${params.lowestScore.toFixed(1)}分）是当前短板，建议作为近期主攻方向。`,
    `建议将${params.lowestSubject}（${params.lowestScore.toFixed(1)}分）列为提分重点，先补基础再做综合训练。`,
  ]

  return `${trendText}${focusTemplates[v]}`
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
    const delta = previousAvg === null ? null : latestAvg - previousAvg

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
    const variant = pickVariant(student, latestAvg)

    const suggestions = lowestSubject
      ? [buildSubjectSuggestion(lowestSubject, variant)]
      : ['建议继续保持当前学习状态。']

    return {
      student,
      overallTrend: trend,
      weakSubjects: lowestSubject ? [lowestSubject] : [],
      strengthSubjects: [],
      commentText: buildCommentText({
        student,
        trend,
        latestAvg,
        previousAvg,
        lowestSubject,
        lowestScore,
        delta,
        variant,
      }),
      suggestions,
    }
  })
}
