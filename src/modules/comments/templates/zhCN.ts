import type { TrendType } from '../../../types/domain'

export function trendSentence(trend: TrendType): string {
  if (trend === 'up') {
    return '整体成绩呈上升趋势，学习状态积极。'
  }
  if (trend === 'down') {
    return '近期成绩有下降趋势，需要及时调整学习节奏。'
  }
  if (trend === 'flat') {
    return '成绩整体较为稳定，可继续巩固基础并争取突破。'
  }
  return '当前数据不足，建议继续积累后观察趋势。'
}

export function weakSubjectSentence(subjects: string[]): string {
  if (!subjects.length) {
    return '当前未发现明显薄弱科目。'
  }
  return `薄弱科目主要为：${subjects.join('、')}。`
}

export function buildSuggestions(subjects: string[]): string[] {
  if (!subjects.length) {
    return ['保持当前学习节奏，适度增加综合训练。']
  }

  return subjects.map((subject) => `建议加强${subject}基础题训练，并进行错题复盘。`)
}
