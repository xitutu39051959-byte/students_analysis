import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/common/EmptyState'
import { getStudentComparison } from '../../modules/analysis/student/studentComparison'
import { getStudentTrend } from '../../modules/analysis/student/studentTrend'
import { listExams, listStudents, listSubjects } from '../../modules/analysis/shared/selectors'
import { exportStudentComparisons } from '../../services/export/exportCsv'
import { useDatasetStore } from '../../store/datasetStore'

function renderDelta(delta: number | null) {
  if (delta === null) {
    return '数据不足'
  }
  if (delta > 0) {
    return `+${delta.toFixed(1)}`
  }
  return delta.toFixed(1)
}

interface StudentOverviewRow {
  student: string
  latestExam: string
  previousExam: string
  latestAvg: number | null
  previousAvg: number | null
  delta: number | null
  weakSubject: string
}

function buildOverview(records: ReturnType<typeof useDatasetStore>['activeRecords']): StudentOverviewRow[] {
  const students = listStudents(records)
  const exams = listExams(records)
  const currentExam = exams[exams.length - 1]?.exam

  if (!currentExam) {
    return []
  }

  return students.map((student) => {
    const comparisons = getStudentComparison(records, student, currentExam)
    const validCurrent = comparisons.filter((item) => item.currentScore !== null)
    const validPrevious = comparisons.filter((item) => item.previousScore !== null)

    const latestAvg =
      validCurrent.length > 0
        ? validCurrent.reduce((sum, item) => sum + (item.currentScore ?? 0), 0) / validCurrent.length
        : null

    const previousAvg =
      validPrevious.length > 0
        ? validPrevious.reduce((sum, item) => sum + (item.previousScore ?? 0), 0) / validPrevious.length
        : null

    const delta = latestAvg !== null && previousAvg !== null ? latestAvg - previousAvg : null

    const weakest = validCurrent
      .slice()
      .sort((a, b) => (a.currentScore ?? 999) - (b.currentScore ?? 999))[0]

    return {
      student,
      latestExam: currentExam,
      previousExam: comparisons[0]?.previousExam ?? '无',
      latestAvg,
      previousAvg,
      delta,
      weakSubject: weakest?.subject ?? '无',
    }
  })
}

export function StudentAnalysisPage() {
  const { activeDatasetId, activeRecords } = useDatasetStore()

  const students = useMemo(() => listStudents(activeRecords), [activeRecords])
  const exams = useMemo(() => listExams(activeRecords), [activeRecords])
  const subjects = useMemo(() => listSubjects(activeRecords), [activeRecords])

  const [viewMode, setViewMode] = useState<'single' | 'all'>('all')
  const [student, setStudent] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('全部')
  const [currentExam, setCurrentExam] = useState('')

  const trendData = useMemo(() => {
    if (!student) {
      return []
    }
    return getStudentTrend(activeRecords, student, subjectFilter)
  }, [activeRecords, student, subjectFilter])

  const comparisonData = useMemo(() => {
    if (!student) {
      return []
    }
    const exam = currentExam || exams[exams.length - 1]?.exam || ''
    if (!exam) {
      return []
    }
    return getStudentComparison(activeRecords, student, exam)
  }, [activeRecords, student, currentExam, exams])

  const overviewRows = useMemo(() => buildOverview(activeRecords), [activeRecords])

  if (!activeDatasetId || activeRecords.length === 0) {
    return <EmptyState title="暂无数据" description="请先导入数据后再进行学生分析。" />
  }

  return (
    <section className="page-section">
      <h2>学生分析</h2>

      <div className="panel filter-row">
        <label>
          查看范围
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'single' | 'all')}>
            <option value="all">全部学生</option>
            <option value="single">单个学生</option>
          </select>
        </label>

        {viewMode === 'single' ? (
          <>
            <label>
              学生
              <select value={student} onChange={(e) => setStudent(e.target.value)}>
                <option value="">请选择学生</option>
                {students.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              科目
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="全部">全部</option>
                {subjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              当前考试
              <select value={currentExam} onChange={(e) => setCurrentExam(e.target.value)}>
                <option value="">默认最近一次</option>
                {exams.map((item) => (
                  <option key={`${item.exam}-${item.examDate}`} value={item.exam}>
                    {item.exam}（{item.examDate}）
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      {viewMode === 'all' ? (
        <div className="panel">
          <h3>全部学生概览（最近一次考试）</h3>
          <table>
            <thead>
              <tr>
                <th>学生</th>
                <th>当前考试</th>
                <th>上一次考试</th>
                <th>当前均分</th>
                <th>上次均分</th>
                <th>变化</th>
                <th>最低科目</th>
              </tr>
            </thead>
            <tbody>
              {overviewRows.map((row) => (
                <tr key={row.student}>
                  <td>{row.student}</td>
                  <td>{row.latestExam}</td>
                  <td>{row.previousExam}</td>
                  <td>{row.latestAvg === null ? '无' : row.latestAvg.toFixed(1)}</td>
                  <td>{row.previousAvg === null ? '无' : row.previousAvg.toFixed(1)}</td>
                  <td>{renderDelta(row.delta)}</td>
                  <td>{row.weakSubject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !student ? (
        <EmptyState title="请选择学生" description="选择学生后将展示成绩变化与上一次考试对比。" />
      ) : (
        <>
          <div className="panel">
            <h3>各科成绩变化</h3>
            <table>
              <thead>
                <tr>
                  <th>科目</th>
                  <th>考试</th>
                  <th>日期</th>
                  <th>分数</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((item, idx) => (
                  <tr key={`${item.subject}-${item.exam}-${idx}`}>
                    <td>{item.subject}</td>
                    <td>{item.exam}</td>
                    <td>{item.examDate}</td>
                    <td>{item.score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-title-row">
              <h3>与上一次考试对比</h3>
              <button onClick={() => exportStudentComparisons(comparisonData)}>导出 CSV</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>科目</th>
                  <th>当前考试</th>
                  <th>上一次考试</th>
                  <th>当前分数</th>
                  <th>上次分数</th>
                  <th>变化</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item) => (
                  <tr key={`${item.subject}-${item.currentExam}`}>
                    <td>{item.subject}</td>
                    <td>{item.currentExam}</td>
                    <td>{item.previousExam}</td>
                    <td>{item.currentScore === null ? '缺失' : item.currentScore.toFixed(1)}</td>
                    <td>{item.previousScore === null ? '缺失' : item.previousScore.toFixed(1)}</td>
                    <td>{renderDelta(item.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
