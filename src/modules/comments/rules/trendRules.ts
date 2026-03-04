import type { AnalysisOptions, StudentComparison } from '../../../types/domain'

export function decideTrend(comparisons: StudentComparison[], options: AnalysisOptions): 'up' | 'down' | 'flat' | 'insufficient_data' {
  const deltas = comparisons.map((item) => item.delta).filter((delta): delta is number => delta !== null)
  if (!deltas.length) {
    return 'insufficient_data'
  }

  const avgDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length

  if (avgDelta >= options.trendUpThreshold) {
    return 'up'
  }
  if (avgDelta <= options.trendDownThreshold) {
    return 'down'
  }
  return 'flat'
}
