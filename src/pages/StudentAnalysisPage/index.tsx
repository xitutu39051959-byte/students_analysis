import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/common/EmptyState'
import { getStudentComparison } from '../../modules/analysis/student/studentComparison'
import { getStudentTrend } from '../../modules/analysis/student/studentTrend'
import { listExams, listStudents, listSubjects } from '../../modules/analysis/shared/selectors'
import { exportStudentComparisons } from '../../services/export/exportCsv'
import { useDatasetStore } from '../../store/datasetStore'
import type { ScoreRecord } from '../../types/domain'

const FULL_MARK_SUBJECTS: Record<string, number> = {
  语文: 150,
  数学: 150,
  英语: 150,
}

const LINE_COLORS = ['#0d6b8a', '#2f855a', '#b7791f', '#c53030', '#6b46c1', '#2b6cb0', '#9c4221', '#2f855a']

interface ProgressSeries {
  subject: string
  values: Array<number | null>
  color: string
}

interface ProgressData {
  examLabels: string[]
  series: ProgressSeries[]
}

interface CompareRow {
  subject: string
  studentRate: number | null
  classRate: number
}

interface RankPoint {
  exam: string
  classRank: number | null
  gradeRank: number | null
  classDelta: number | null
  gradeDelta: number | null
}

function getFullMark(subject: string): number {
  return FULL_MARK_SUBJECTS[subject] ?? 100
}

function toRate(score: number, subject: string): number {
  return (score / getFullMark(subject)) * 100
}

function renderDelta(delta: number | null) {
  if (delta === null) {
    return '数据不足'
  }
  if (delta > 0) {
    return `+${delta.toFixed(1)}`
  }
  return delta.toFixed(1)
}

function computeRankDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) {
    return null
  }
  return previous - current
}

function buildRankTimeline(records: ScoreRecord[], student: string): RankPoint[] {
  const studentRecords = records.filter((record) => record.student === student)
  const exams = listExams(studentRecords)

  const raw = exams.map((exam) => {
    const rows = studentRecords.filter((record) => record.exam === exam.exam && record.examDate === exam.examDate)
    const rowWithRank = rows.find((row) => row.classRank !== null || row.gradeRank !== null) ?? rows[0]

    return {
      exam: exam.exam,
      classRank: rowWithRank?.classRank ?? null,
      gradeRank: rowWithRank?.gradeRank ?? null,
      classDelta: rowWithRank?.classRankDelta ?? null,
      gradeDelta: rowWithRank?.gradeRankDelta ?? null,
    }
  })

  return raw.map((item, idx) => {
    const prev = raw[idx - 1]
    return {
      ...item,
      classDelta: item.classDelta ?? computeRankDelta(item.classRank, prev?.classRank ?? null),
      gradeDelta: item.gradeDelta ?? computeRankDelta(item.gradeRank, prev?.gradeRank ?? null),
    }
  })
}

function buildProgressData(records: ScoreRecord[], student: string): ProgressData {
  const studentRecords = records.filter((record) => record.student === student)
  const exams = listExams(studentRecords)
  const subjects = listSubjects(studentRecords)

  const series = subjects.map((subject, index) => ({
    subject,
    color: LINE_COLORS[index % LINE_COLORS.length],
    values: exams.map((exam) => {
      const row = studentRecords.find((record) => record.subject === subject && record.exam === exam.exam)
      return row ? toRate(row.score, subject) : null
    }),
  }))

  return {
    examLabels: exams.map((item) => item.exam),
    series,
  }
}

function buildCompareRows(records: ScoreRecord[], student: string, exam: string): CompareRow[] {
  const examRecords = records.filter((record) => record.exam === exam)
  const subjects = listSubjects(examRecords)

  return subjects.map((subject) => {
    const subjectRows = examRecords.filter((record) => record.subject === subject)
    const classAvg =
      subjectRows.length > 0 ? subjectRows.reduce((sum, item) => sum + item.score, 0) / subjectRows.length : 0

    const studentRow = subjectRows.find((row) => row.student === student)

    return {
      subject,
      studentRate: studentRow ? toRate(studentRow.score, subject) : null,
      classRate: toRate(classAvg, subject),
    }
  })
}

function calcOverallRate(rows: CompareRow[]): { student: number | null; classAvg: number } {
  const classAvg = rows.length > 0 ? rows.reduce((sum, row) => sum + row.classRate, 0) / rows.length : 0

  const studentRows = rows.filter((row) => row.studentRate !== null)
  const student =
    studentRows.length > 0
      ? studentRows.reduce((sum, row) => sum + (row.studentRate ?? 0), 0) / studentRows.length
      : null

  return { student, classAvg }
}

function ProgressLineChart({ data }: { data: ProgressData }) {
  if (data.examLabels.length < 2 || data.series.length === 0) {
    return <p>折线图数据不足</p>
  }

  const width = 760
  const height = 260
  const padding = 36
  const gridValues = [0, 25, 50, 75, 100]

  const xByIndex = (index: number) =>
    padding + (index * (width - padding * 2)) / Math.max(1, data.examLabels.length - 1)

  const yByRate = (rate: number) => height - padding - (rate / 100) * (height - padding * 2)

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '260px' }}>
        <rect width={width} height={height} fill="#ffffff" />

        {gridValues.map((grid) => {
          const y = yByRate(grid)
          return (
            <g key={grid}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" />
              <text x={8} y={y + 4} fontSize="11" fill="#64748b">
                {grid}%
              </text>
            </g>
          )
        })}

        {data.examLabels.map((label, index) => {
          const x = xByIndex(index)
          return (
            <text key={`${label}-${index}`} x={x} y={height - 10} textAnchor="middle" fontSize="11" fill="#334e5a">
              {label}
            </text>
          )
        })}

        {data.series.map((series) => {
          const points = series.values
            .map((value, idx) => (value === null ? null : `${xByIndex(idx)},${yByRate(value)}`))
            .filter((item): item is string => item !== null)

          return (
            <g key={series.subject}>
              {points.length >= 2 ? <polyline points={points.join(' ')} fill="none" stroke={series.color} strokeWidth="2.5" /> : null}
              {series.values.map((value, idx) => {
                if (value === null) {
                  return null
                }
                return <circle key={`${series.subject}-${idx}`} cx={xByIndex(idx)} cy={yByRate(value)} r="3.5" fill={series.color} />
              })}
            </g>
          )
        })}
      </svg>

      <div className="stats-row">
        {data.series.map((series) => (
          <span key={`${series.subject}-legend`}>
            <span style={{ display: 'inline-block', width: 10, height: 10, background: series.color, marginRight: 6 }} />
            {series.subject}
          </span>
        ))}
      </div>
    </div>
  )
}

function RadarCompareChart({ rows }: { rows: CompareRow[] }) {
  if (rows.length < 3) {
    return <p>八卦图数据不足</p>
  }

  const size = 360
  const center = size / 2
  const radius = 130

  const angle = (index: number) => (Math.PI * 2 * index) / rows.length - Math.PI / 2
  const axisPoints = rows.map((_, idx) => {
    const a = angle(idx)
    return { x: center + radius * Math.cos(a), y: center + radius * Math.sin(a) }
  })

  const toPolygon = (selector: (row: CompareRow) => number | null) =>
    rows
      .map((row, idx) => {
        const value = selector(row)
        const rate = value === null ? 0 : value
        const r = (rate / 100) * radius
        const a = angle(idx)
        return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`
      })
      .join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: '380px', height: '360px' }}>
        <circle cx={center} cy={center} r={radius} fill="#f5fbfd" stroke="#d0d9e1" />

        {axisPoints.map((p, idx) => (
          <g key={rows[idx].subject}>
            <line x1={center} y1={center} x2={p.x} y2={p.y} stroke="#c4d1d8" />
            <text x={p.x} y={p.y} textAnchor="middle" fontSize="11" fill="#334e5a">
              {rows[idx].subject}
            </text>
          </g>
        ))}

        <polygon points={toPolygon((r) => r.classRate)} fill="rgba(148,163,184,0.25)" stroke="#64748b" strokeWidth="2" />
        <polygon points={toPolygon((r) => r.studentRate)} fill="rgba(13,107,138,0.25)" stroke="#0d6b8a" strokeWidth="2" />
      </svg>

      <div className="stats-row">
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: '#0d6b8a', marginRight: 6 }} />学生
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: '#64748b', marginRight: 6 }} />班级均分
        </span>
      </div>
    </div>
  )
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

  const latestExam = exams[exams.length - 1]?.exam ?? ''

  const allStudentCharts = useMemo(() => {
    if (!latestExam) {
      return [] as Array<{
        student: string
        progress: ProgressData
        compareRows: CompareRow[]
        overall: { student: number | null; classAvg: number }
        rankTimeline: RankPoint[]
      }>
    }

    return students.map((name) => {
      const progress = buildProgressData(activeRecords, name)
      const compareRows = buildCompareRows(activeRecords, name, latestExam)
      return {
        student: name,
        progress,
        compareRows,
        overall: calcOverallRate(compareRows),
        rankTimeline: buildRankTimeline(activeRecords, name),
      }
    })
  }, [activeRecords, students, latestExam])

  const singleProgress = useMemo(() => (student ? buildProgressData(activeRecords, student) : { examLabels: [], series: [] }), [activeRecords, student])
  const singleCompareRows = useMemo(
    () => (student && (currentExam || latestExam) ? buildCompareRows(activeRecords, student, currentExam || latestExam) : []),
    [activeRecords, student, currentExam, latestExam],
  )
  const singleOverall = useMemo(() => calcOverallRate(singleCompareRows), [singleCompareRows])
  const singleRankTimeline = useMemo(() => (student ? buildRankTimeline(activeRecords, student) : []), [activeRecords, student])

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
          <h3>每位学生进退步与班均对比（得分率）</h3>
          {allStudentCharts.map((item) => (
            <details key={item.student} style={{ marginBottom: 12 }}>
              <summary>
                {item.student}：个人全科得分率 {item.overall.student === null ? '无' : `${item.overall.student.toFixed(1)}%`} / 班均{' '}
                {item.overall.classAvg.toFixed(1)}%
              </summary>
              <div className="panel" style={{ marginTop: 10 }}>
                <h4>{item.student} 各科进退步折线图</h4>
                <ProgressLineChart data={item.progress} />
              </div>
              <div className="panel" style={{ marginTop: 10 }}>
                <h4>{item.student} 全科与班级均分八卦图（最近考试）</h4>
                <RadarCompareChart rows={item.compareRows} />
              </div>
              <div className="panel" style={{ marginTop: 10 }}>
                <h4>{item.student} 班级/段名次进退</h4>
                <table>
                  <thead>
                    <tr>
                      <th>考试</th>
                      <th>班排</th>
                      <th>班排进退</th>
                      <th>段排</th>
                      <th>段排进退</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.rankTimeline.map((row) => (
                      <tr key={`${item.student}-${row.exam}`}>
                        <td>{row.exam}</td>
                        <td>{row.classRank ?? '无'}</td>
                        <td>{renderDelta(row.classDelta)}</td>
                        <td>{row.gradeRank ?? '无'}</td>
                        <td>{renderDelta(row.gradeDelta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      ) : !student ? (
        <EmptyState title="请选择学生" description="选择学生后将展示进退步折线图、八卦图与名次进退。" />
      ) : (
        <>
          <div className="panel">
            <h3>{student} 各科进退步折线图（得分率）</h3>
            <ProgressLineChart data={singleProgress} />
          </div>

          <div className="panel">
            <h3>{student} 全科与班级均分八卦图（最近考试）</h3>
            <p>
              个人全科得分率：{singleOverall.student === null ? '无' : `${singleOverall.student.toFixed(1)}%`}，班级全科均分率：
              {singleOverall.classAvg.toFixed(1)}%
            </p>
            <RadarCompareChart rows={singleCompareRows} />
          </div>

          <div className="panel">
            <h3>{student} 班级/段名次进退</h3>
            <table>
              <thead>
                <tr>
                  <th>考试</th>
                  <th>班排</th>
                  <th>班排进退</th>
                  <th>段排</th>
                  <th>段排进退</th>
                </tr>
              </thead>
              <tbody>
                {singleRankTimeline.map((row) => (
                  <tr key={`${student}-${row.exam}`}>
                    <td>{row.exam}</td>
                    <td>{row.classRank ?? '无'}</td>
                    <td>{renderDelta(row.classDelta)}</td>
                    <td>{row.gradeRank ?? '无'}</td>
                    <td>{renderDelta(row.gradeDelta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-title-row">
              <h3>与上一次考试对比（原始分数）</h3>
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

          <div className="panel">
            <h3>明细数据（原始分数）</h3>
            <table>
              <thead>
                <tr>
                  <th>科目</th>
                  <th>考试</th>
                  <th>日期</th>
                  <th>分数</th>
                  <th>得分率</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((item, idx) => (
                  <tr key={`${item.subject}-${item.exam}-${idx}`}>
                    <td>{item.subject}</td>
                    <td>{item.exam}</td>
                    <td>{item.examDate}</td>
                    <td>{item.score.toFixed(1)}</td>
                    <td>{toRate(item.score, item.subject).toFixed(1)}%</td>
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
