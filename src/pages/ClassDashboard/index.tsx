import { useMemo } from 'react'
import { EmptyState } from '../../components/common/EmptyState'
import { getExamSummaries } from '../../modules/analysis/class/classMetrics'
import { listSubjects } from '../../modules/analysis/shared/selectors'
import { useDatasetStore } from '../../store/datasetStore'

const FULL_MARK_SUBJECTS: Record<string, number> = {
  语文: 150,
  数学: 150,
  英语: 150,
}

function getFullMark(subject: string): number {
  return FULL_MARK_SUBJECTS[subject] ?? 100
}

function RadarChart({ data }: { data: Array<{ subject: string; value: number }> }) {
  if (data.length < 3) {
    return <p>八卦图数据不足</p>
  }

  const size = 340
  const center = size / 2
  const radius = 125
  const maxValue = 100

  const angle = (index: number) => (Math.PI * 2 * index) / data.length - Math.PI / 2
  const axisPoints = data.map((_, idx) => {
    const a = angle(idx)
    return { x: center + radius * Math.cos(a), y: center + radius * Math.sin(a) }
  })

  const valuePoints = data.map((item, idx) => {
    const r = (item.value / maxValue) * radius
    const a = angle(idx)
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) }
  })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: '360px', height: '360px' }}>
      <circle cx={center} cy={center} r={radius} fill="#f5fbfd" stroke="#d0d9e1" />
      {axisPoints.map((p, idx) => (
        <g key={data[idx].subject}>
          <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="#c4d1d8" />
          <text x={p.x} y={p.y} fontSize="11" fill="#334e5a" textAnchor="middle">
            {data[idx].subject}
          </text>
        </g>
      ))}
      <polygon points={valuePoints.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(13,107,138,0.25)" stroke="#0d6b8a" strokeWidth="2" />
      {valuePoints.map((p, idx) => (
        <text key={`${data[idx].subject}-v`} x={p.x} y={p.y - 6} fontSize="11" fill="#0d6b8a" textAnchor="middle">
          {data[idx].value.toFixed(1)}
        </text>
      ))}
    </svg>
  )
}

export function ClassDashboard() {
  const { activeDatasetId, activeRecords } = useDatasetStore()

  const summaries = useMemo(() => getExamSummaries(activeRecords), [activeRecords])
  const radarData = useMemo(() => {
    const subjects = listSubjects(activeRecords)
    return subjects.map((subject) => {
      const rows = activeRecords.filter((r) => r.subject === subject)
      const avg = rows.length ? rows.reduce((sum, item) => sum + item.score, 0) / rows.length : 0
      return { subject, value: (avg / getFullMark(subject)) * 100 }
    })
  }, [activeRecords])

  if (!activeDatasetId || activeRecords.length === 0) {
    return <EmptyState title="暂无数据" description="请先在成绩上传页面上传并保存成绩文件。" />
  }

  return (
    <section className="page-section">
      <h2>班级分析</h2>

      <div className="panel">
        <h3>科目平均得分率八卦图（语数英按150分，其它按100分）</h3>
        <RadarChart data={radarData} />
      </div>

      <div className="panel">
        <h3>每次考试每个科目统计</h3>
        <table>
          <thead>
            <tr>
              <th>考试</th>
              <th>科目</th>
              <th>平均分</th>
              <th>最高分</th>
              <th>最低分</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((item, index) => (
              <tr key={`${item.exam}-${item.subject}-${item.examDate}-${index}`}>
                <td>{item.exam}</td>
                <td>{item.subject}</td>
                <td>{item.avgScore.toFixed(1)}</td>
                <td>{item.maxScore.toFixed(1)}</td>
                <td>{item.minScore.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
