import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/common/EmptyState'
import { generateStudentComments } from '../../modules/comments/generator/commentGenerator'
import { listStudents } from '../../modules/analysis/shared/selectors'
import { exportComments } from '../../services/export/exportCsv'
import { useDatasetStore } from '../../store/datasetStore'
import { useSettingsStore } from '../../store/settingsStore'

export function CommentsPage() {
  const { activeDatasetId, activeRecords } = useDatasetStore()
  const { options } = useSettingsStore()

  const students = useMemo(() => listStudents(activeRecords), [activeRecords])
  const [targetMode, setTargetMode] = useState<'all' | 'single'>('all')
  const [targetStudent, setTargetStudent] = useState('')

  const comments = useMemo(() => {
    if (!activeRecords.length) {
      return []
    }
    if (targetMode === 'single') {
      if (!targetStudent) {
        return []
      }
      return generateStudentComments(activeRecords, options, targetStudent)
    }
    return generateStudentComments(activeRecords, options)
  }, [activeRecords, options, targetMode, targetStudent])

  if (!activeDatasetId || activeRecords.length === 0) {
    return <EmptyState title="暂无数据" description="请先导入成绩数据，再生成评语。" />
  }

  return (
    <section className="page-section">
      <h2>评语生成</h2>

      <div className="panel filter-row">
        <label>
          目标范围
          <select value={targetMode} onChange={(e) => setTargetMode(e.target.value as 'all' | 'single')}>
            <option value="all">全班</option>
            <option value="single">单个学生</option>
          </select>
        </label>

        {targetMode === 'single' ? (
          <label>
            学生
            <select value={targetStudent} onChange={(e) => setTargetStudent(e.target.value)}>
              <option value="">请选择学生</option>
              {students.map((student) => (
                <option key={student} value={student}>
                  {student}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button onClick={() => exportComments(comments)} disabled={!comments.length}>
          导出 CSV
        </button>
      </div>

      {!comments.length ? (
        <EmptyState title="暂无评语结果" description="请选择目标范围后自动生成评语。" />
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>学生</th>
                <th>趋势</th>
                <th>薄弱科目</th>
                <th>评语</th>
                <th>建议</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((item) => (
                <tr key={item.student}>
                  <td>{item.student}</td>
                  <td>{item.overallTrend}</td>
                  <td>{item.weakSubjects.join('、') || '无'}</td>
                  <td>{item.commentText}</td>
                  <td>{item.suggestions.join('；')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
