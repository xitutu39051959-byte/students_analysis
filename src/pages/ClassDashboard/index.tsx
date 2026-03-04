import { useMemo } from 'react'
import { EmptyState } from '../../components/common/EmptyState'
import { getExamSummaries } from '../../modules/analysis/class/classMetrics'
import { useDatasetStore } from '../../store/datasetStore'

export function ClassDashboard() {
  const { activeDatasetId, activeRecords } = useDatasetStore()

  const summaries = useMemo(() => getExamSummaries(activeRecords), [activeRecords])

  if (!activeDatasetId || activeRecords.length === 0) {
    return <EmptyState title="暂无数据" description="请先在成绩上传页面上传并保存成绩文件。" />
  }

  return (
    <section className="page-section">
      <h2>班级分析</h2>

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
