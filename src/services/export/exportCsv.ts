import type { ExamSummary, StudentComment, StudentComparison } from '../../types/domain'

function toCsvValue(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const lines = [headers, ...rows].map((line) => line.map(toCsvValue).join(','))
  const csvContent = `\uFEFF${lines.join('\n')}`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportExamSummaries(data: ExamSummary[]): void {
  const rows = data.map((item) => [
    item.exam,
    item.examDate,
    item.subject,
    item.avgScore.toFixed(1),
    item.maxScore.toFixed(1),
    item.minScore.toFixed(1),
    item.sampleSize,
  ])

  downloadCsv('班级分析.csv', ['考试', '考试日期', '科目', '平均分', '最高分', '最低分', '样本数'], rows)
}

export function exportStudentComparisons(data: StudentComparison[]): void {
  const rows = data.map((item) => [
    item.student,
    item.subject,
    item.currentExam,
    item.previousExam,
    item.currentScore === null ? '缺失' : item.currentScore.toFixed(1),
    item.previousScore === null ? '缺失' : item.previousScore.toFixed(1),
    item.delta === null ? '数据不足' : item.delta.toFixed(1),
  ])

  downloadCsv('学生对比.csv', ['学生', '科目', '当前考试', '上一次考试', '当前分数', '上次分数', '变化值'], rows)
}

export function exportComments(data: StudentComment[]): void {
  const rows = data.map((item) => [item.student, item.commentText, item.suggestions.join('；')])
  downloadCsv('学生评语.csv', ['学生', '评语', '建议'], rows)
}
