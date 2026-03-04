import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/common/EmptyState'
import { getClassOverview, getExamSummaries } from '../../modules/analysis/class/classMetrics'
import { getSubjectTrend } from '../../modules/analysis/class/classTrend'
import { listExams, listSubjects } from '../../modules/analysis/shared/selectors'
import { exportExamSummaries } from '../../services/export/exportCsv'
import { useDatasetStore } from '../../store/datasetStore'

export function ClassAnalysisPage() {
  const { activeRecords, activeDatasetId } = useDatasetStore()

  const exams = useMemo(() => listExams(activeRecords), [activeRecords])
  const subjects = useMemo(() => listSubjects(activeRecords), [activeRecords])

  const [examFilter, setExamFilter] = useState('全部')
  const [subjectFilter, setSubjectFilter] = useState('全部')

  const filteredRecords = useMemo(
    () =>
      activeRecords.filter((record) => {
        if (examFilter !== '全部' && record.exam !== examFilter) {
          return false
        }
        if (subjectFilter !== '全部' && record.subject !== subjectFilter) {
          return false
        }
        return true
      }),
    [activeRecords, examFilter, subjectFilter],
  )

  const overview = useMemo(() => getClassOverview(filteredRecords), [filteredRecords])
  const summaries = useMemo(() => getExamSummaries(activeRecords, examFilter, subjectFilter), [activeRecords, examFilter, subjectFilter])
  const trend = useMemo(() => getSubjectTrend(activeRecords, subjectFilter), [activeRecords, subjectFilter])

  if (!activeDatasetId || activeRecords.length === 0) {
    return <EmptyState title="暂无数据" description="请先在数据导入页面上传并导入成绩文件。" />
  }

  return (
    <section className="page-section">
      <h2>班级分析</h2>

      <div className="panel filter-row">
        <label>
          考试
          <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="全部">全部</option>
            {exams.map((exam) => (
              <option key={`${exam.exam}-${exam.examDate}`} value={exam.exam}>
                {exam.exam}（{exam.examDate}）
              </option>
            ))}
          </select>
        </label>

        <label>
          科目
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="全部">全部</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel stats-row">
        <span>平均分：{overview.avg.toFixed(1)}</span>
        <span>最高分：{overview.max.toFixed(1)}</span>
        <span>最低分：{overview.min.toFixed(1)}</span>
        <span>样本数：{overview.sampleSize}</span>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <h3>每次考试每科统计</h3>
          <button onClick={() => exportExamSummaries(summaries)}>导出 CSV</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>考试</th>
              <th>日期</th>
              <th>科目</th>
              <th>平均分</th>
              <th>最高分</th>
              <th>最低分</th>
              <th>样本数</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((item, idx) => (
              <tr key={`${item.exam}-${item.examDate}-${item.subject}-${idx}`}>
                <td>{item.exam}</td>
                <td>{item.examDate}</td>
                <td>{item.subject}</td>
                <td>{item.avgScore.toFixed(1)}</td>
                <td>{item.maxScore.toFixed(1)}</td>
                <td>{item.minScore.toFixed(1)}</td>
                <td>{item.sampleSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>分数趋势（按考试日期）</h3>
        <table>
          <thead>
            <tr>
              <th>科目</th>
              <th>考试</th>
              <th>日期</th>
              <th>平均分</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((item, idx) => (
              <tr key={`${item.subject}-${item.exam}-${item.examDate}-${idx}`}>
                <td>{item.subject}</td>
                <td>{item.exam}</td>
                <td>{item.examDate}</td>
                <td>{item.avgScore.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
