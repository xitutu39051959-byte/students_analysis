import type { ScoreRecord } from '../../../types/domain'

export function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item)
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {})
}

export function averageScore(records: ScoreRecord[]): number {
  if (!records.length) {
    return 0
  }
  return records.reduce((sum, item) => sum + item.score, 0) / records.length
}
