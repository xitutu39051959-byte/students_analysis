import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { EmptyState } from '../../components/common/EmptyState'
import { useDatasetStore } from '../../store/datasetStore'
import { useUiStore } from '../../store/uiStore'
import type { ScoreRecord } from '../../types/domain'

interface ParsedRecord {
  学生: string
  考试: string
  科目: string
  分数: number
}

interface ParseStats {
  studentCount: number
  examCount: number
  subjectCount: number
  totalRecords: number
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

async function parseScoreFile(file: File): Promise<ParsedRecord[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
    throw new Error('仅支持 CSV 或 Excel 文件（.csv/.xlsx/.xls）')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: '',
    raw: false,
  })

  if (!rows.length) {
    throw new Error('文件内容为空')
  }

  const required = ['学生', '考试', '科目', '分数']
  const headers = Object.keys(rows[0] ?? {})
  const missingHeaders = required.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(`缺少必要列：${missingHeaders.join('、')}`)
  }

  const records: ParsedRecord[] = []

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const student = normalizeCell(row['学生'])
    const exam = normalizeCell(row['考试'])
    const subject = normalizeCell(row['科目'])
    const score = Number(normalizeCell(row['分数']))

    if (!student || !exam || !subject || Number.isNaN(score)) {
      continue
    }

    if (score < 0 || score > 100) {
      throw new Error(`第 ${index + 2} 行分数超出范围（0-100）`)
    }

    records.push({ 学生: student, 考试: exam, 科目: subject, 分数: score })
  }

  if (!records.length) {
    throw new Error('未解析到有效记录，请检查文件内容')
  }

  return records
}

function buildStats(records: ParsedRecord[]): ParseStats {
  return {
    studentCount: new Set(records.map((record) => record.学生)).size,
    examCount: new Set(records.map((record) => record.考试)).size,
    subjectCount: new Set(records.map((record) => record.科目)).size,
    totalRecords: records.length,
  }
}

function toIsoDateByIndex(index: number): string {
  const date = new Date('2026-01-01')
  date.setDate(date.getDate() + index)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toScoreRecords(records: ParsedRecord[], className: string, term: string): ScoreRecord[] {
  const examNames = Array.from(new Set(records.map((record) => record.考试)))
  const examDateMap = new Map<string, string>(examNames.map((exam, index) => [exam, toIsoDateByIndex(index)]))

  return records.map((record) => ({
    student: record.学生,
    exam: record.考试,
    subject: record.科目,
    score: record.分数,
    examDate: examDateMap.get(record.考试) ?? '2026-01-01',
    className,
    term,
  }))
}

export function UploadPage() {
  const navigate = useNavigate()
  const { importDataset } = useDatasetStore()
  const { showToast } = useUiStore()

  const [datasetName, setDatasetName] = useState(`数据集-${new Date().toLocaleDateString('zh-CN')}`)
  const [className, setClassName] = useState('')
  const [term, setTerm] = useState('')

  const [fileName, setFileName] = useState('')
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([])
  const [stats, setStats] = useState<ParseStats | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (file: File) => {
    setLoading(true)
    setFileName(file.name)
    setErrorMessage('')
    setStats(null)
    setParsedRecords([])

    try {
      const records = await parseScoreFile(file)
      setParsedRecords(records)
      setStats(buildStats(records))
      showToast('文件解析成功', 'success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '解析失败，请检查文件格式')
      showToast('文件解析失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!stats || !parsedRecords.length) {
      showToast('请先上传并解析文件', 'error')
      return
    }

    if (!datasetName || !className || !term) {
      showToast('请填写数据集名称、班级、学期', 'error')
      return
    }

    const scoreRecords = toScoreRecords(parsedRecords, className, term)

    await importDataset({
      datasetName,
      className,
      term,
      records: scoreRecords,
    })

    showToast('数据已保存，正在跳转班级分析', 'success')
    navigate('/class-analysis')
  }

  return (
    <section className="page-section">
      <h2>成绩上传</h2>

      <div className="panel form-grid">
        <label>
          数据集名称
          <input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} />
        </label>
        <label>
          班级
          <input value={className} onChange={(e) => setClassName(e.target.value)} />
        </label>
        <label>
          学期
          <input value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
      </div>

      <div className="panel">
        <p>请上传 CSV 或 Excel 文件，字段格式：学生、考试、科目、分数</p>
        <label>
          选择文件（CSV/XLSX）
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void handleFileChange(file)
              }
            }}
          />
        </label>
      </div>

      {loading ? <p>正在解析文件...</p> : null}
      {errorMessage ? <p className="text-error">{errorMessage}</p> : null}
      {fileName ? <p>当前文件：{fileName}</p> : null}

      {stats ? (
        <div className="panel">
          <h3>解析结果</h3>
          <div className="stats-row">
            <span>学生数量：{stats.studentCount}</span>
            <span>考试数量：{stats.examCount}</span>
            <span>科目数量：{stats.subjectCount}</span>
            <span>总记录数：{stats.totalRecords}</span>
          </div>
          <div className="panel-title-row">
            <p>上传并解析成功。</p>
            <button onClick={() => void handleSave()}>保存并进入班级分析</button>
          </div>
        </div>
      ) : (
        <EmptyState title="请上传成绩文件" description="必填列：学生、考试、科目、分数。" />
      )}
    </section>
  )
}
