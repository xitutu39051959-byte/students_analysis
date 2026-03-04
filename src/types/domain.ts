export type TrendType = 'up' | 'down' | 'flat' | 'insufficient_data'

export interface ScoreRecordRaw {
  student: string
  exam: string
  subject: string
  score: string | number | null
  examDate: string
}

export interface ScoreRecord {
  student: string
  exam: string
  subject: string
  score: number
  examDate: string
  className: string
  term: string
  classRank?: number | null
  gradeRank?: number | null
  classRankDelta?: number | null
  gradeRankDelta?: number | null
}

export interface DatasetMeta {
  datasetId: string
  datasetName: string
  className: string
  term: string
  createdAt: string
  recordCount: number
  examCount: number
  studentCount: number
  subjectCount: number
}

export interface ExamSummary {
  exam: string
  examDate: string
  subject: string
  avgScore: number
  maxScore: number
  minScore: number
  sampleSize: number
}

export interface SubjectTrendPoint {
  subject: string
  exam: string
  examDate: string
  avgScore: number
}

export interface StudentSubjectPoint {
  student: string
  subject: string
  exam: string
  examDate: string
  score: number
}

export interface StudentComparison {
  student: string
  subject: string
  currentExam: string
  previousExam: string
  currentScore: number | null
  previousScore: number | null
  delta: number | null
}

export interface StudentWeakSubject {
  student: string
  subject: string
  currentScore: number
  classAvg: number
  gapToAvg: number
}

export interface StudentComment {
  student: string
  overallTrend: TrendType
  weakSubjects: string[]
  strengthSubjects: string[]
  commentText: string
  suggestions: string[]
}

export interface Dataset {
  meta: DatasetMeta
  records: ScoreRecord[]
}

export interface AnalysisOptions {
  trendUpThreshold: number
  trendDownThreshold: number
  weakGapThreshold: number
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  trendUpThreshold: 5,
  trendDownThreshold: -5,
  weakGapThreshold: 8,
}
