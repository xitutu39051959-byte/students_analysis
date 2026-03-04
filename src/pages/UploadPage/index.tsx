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

interface ParsePreview {
  source: string
  mode: 'long' | 'wide'
  headerRow: number
  subjectColumns: string[]
  ignoredColumns: string[]
  recordCount: number
}

interface ParseResult {
  records: ParsedRecord[]
  preview: ParsePreview
}

const STUDENT_ALIASES = ['学生', '姓名']
const EXAM_ALIASES = ['考试', '考试名称']
const SUBJECT_ALIASES = ['科目', '学科']
const SCORE_ALIASES = ['分数', '成绩']

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

function isIgnoredWideColumn(name: string): boolean {
  return /(排|进退|总分|折算|座号|排名)/.test(name)
}

function parseScoreValue(raw: string): number | null {
  if (!raw) {
    return null
  }
  const value = Number(raw)
  if (Number.isNaN(value)) {
    return null
  }
  if (value < 0 || value > 150) {
    return null
  }
  return value
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header))
}

function detectHeaderRow(rows: string[][]): { rowIndex: number; mode: 'long' | 'wide' } {
  let wideCandidate = -1

  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const row = rows[index]
    const hasStudent = row.some((cell) => STUDENT_ALIASES.includes(cell))
    if (!hasStudent) {
      continue
    }

    const hasExam = row.some((cell) => EXAM_ALIASES.includes(cell))
    const hasSubject = row.some((cell) => SUBJECT_ALIASES.includes(cell))
    const hasScore = row.some((cell) => SCORE_ALIASES.includes(cell))

    if (hasExam && hasSubject && hasScore) {
      return { rowIndex: index, mode: 'long' }
    }

    if (wideCandidate === -1) {
      wideCandidate = index
    }
  }

  if (wideCandidate !== -1) {
    return { rowIndex: wideCandidate, mode: 'wide' }
  }

  throw new Error('无法识别表头，请确认包含“学生”列')
}

function parseLongTable(rows: string[][], headerRow: number, fallbackExamName: string, source: string): ParseResult {
  const headers = rows[headerRow]
  const studentIndex = findColumnIndex(headers, STUDENT_ALIASES)
  const examIndex = findColumnIndex(headers, EXAM_ALIASES)
  const subjectIndex = findColumnIndex(headers, SUBJECT_ALIASES)
  const scoreIndex = findColumnIndex(headers, SCORE_ALIASES)

  if (studentIndex < 0 || subjectIndex < 0 || scoreIndex < 0) {
    throw new Error('长表识别失败：缺少学生/科目/分数字段')
  }

  const records: ParsedRecord[] = []
  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const student = normalizeCell(row[studentIndex])
    const exam = normalizeCell(row[examIndex]) || fallbackExamName
    const subject = normalizeCell(row[subjectIndex])
    const score = parseScoreValue(normalizeCell(row[scoreIndex]))

    if (!student || !exam || !subject || score === null) {
      continue
    }

    records.push({ 学生: student, 考试: exam, 科目: subject, 分数: score })
  }

  if (!records.length) {
    throw new Error('未解析到有效记录，请检查长表数据')
  }

  return {
    records,
    preview: {
      source,
      mode: 'long',
      headerRow: headerRow + 1,
      subjectColumns: Array.from(new Set(records.map((item) => item.科目))).sort((a, b) => a.localeCompare(b)),
      ignoredColumns: [],
      recordCount: records.length,
    },
  }
}

function parseWideTable(rows: string[][], headerRow: number, examName: string, source: string): ParseResult {
  const headers = rows[headerRow].map((item) => normalizeCell(item))
  const studentIndex = findColumnIndex(headers, STUDENT_ALIASES)

  if (studentIndex < 0) {
    throw new Error('宽表识别失败：缺少学生列')
  }

  const subjectIndices: Array<{ index: number; name: string }> = []
  const ignoredColumns: string[] = []

  for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
    const header = headers[columnIndex]
    if (!header || columnIndex === studentIndex) {
      continue
    }

    if (isIgnoredWideColumn(header)) {
      ignoredColumns.push(header)
      continue
    }

    const hasNumeric = rows.slice(headerRow + 1).some((row) => parseScoreValue(normalizeCell(row[columnIndex])) !== null)

    if (hasNumeric) {
      subjectIndices.push({ index: columnIndex, name: header })
    } else {
      ignoredColumns.push(header)
    }
  }

  if (!subjectIndices.length) {
    throw new Error('宽表识别失败：未识别到科目列')
  }

  const records: ParsedRecord[] = []
  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const student = normalizeCell(row[studentIndex])
    if (!student) {
      continue
    }

    for (const subject of subjectIndices) {
      const score = parseScoreValue(normalizeCell(row[subject.index]))
      if (score === null) {
        continue
      }

      records.push({
        学生: student,
        考试: examName,
        科目: subject.name,
        分数: score,
      })
    }
  }

  if (!records.length) {
    throw new Error('未解析到有效记录，请检查宽表数据')
  }

  return {
    records,
    preview: {
      source,
      mode: 'wide',
      headerRow: headerRow + 1,
      subjectColumns: subjectIndices.map((item) => item.name),
      ignoredColumns: Array.from(new Set(ignoredColumns)),
      recordCount: records.length,
    },
  }
}

function parseSheet(
  rows: string[][],
  sheetName: string,
  examNameBase: string,
  sourceFileName: string,
  multiSheet: boolean,
): ParseResult {
  const source = `${sourceFileName} / ${sheetName}`
  const { rowIndex, mode } = detectHeaderRow(rows)
  const inferredExamName = multiSheet ? `${examNameBase}-${sheetName}` : examNameBase

  return mode === 'long'
    ? parseLongTable(rows, rowIndex, inferredExamName, source)
    : parseWideTable(rows, rowIndex, inferredExamName, source)
}

async function parseScoreFile(file: File, examName: string): Promise<ParseResult[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
    throw new Error(`文件 ${file.name} 不是支持的格式`) 
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetNames = workbook.SheetNames
  if (!sheetNames.length) {
    throw new Error(`文件 ${file.name} 没有可读取的工作表`)
  }

  const examNameBase = examName || stripFileExtension(file.name)
  const results: ParseResult[] = []

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })
    const rows = matrix.map((row) => row.map((cell) => normalizeCell(cell)))
    if (!rows.length) {
      continue
    }

    try {
      const parsed = parseSheet(rows, sheetName, examNameBase, file.name, sheetNames.length > 1)
      results.push(parsed)
    } catch {
      // Ignore sheets that are not score tables, while still parsing other sheets.
      continue
    }
  }

  if (!results.length) {
    throw new Error(`文件 ${file.name} 未识别到可用成绩表`) 
  }

  return results
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
  const [examName, setExamName] = useState('')

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([])
  const [stats, setStats] = useState<ParseStats | null>(null)
  const [previews, setPreviews] = useState<ParsePreview[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFilesChange = async (files: FileList) => {
    const fileList = Array.from(files)
    if (!fileList.length) {
      return
    }

    setLoading(true)
    setSelectedFiles(fileList.map((item) => item.name))
    setErrorMessage('')
    setStats(null)
    setPreviews([])
    setParsedRecords([])

    try {
      const allParsed: ParsedRecord[] = []
      const allPreviews: ParsePreview[] = []

      for (const file of fileList) {
        const parsedList = await parseScoreFile(file, examName)
        for (const parsed of parsedList) {
          allParsed.push(...parsed.records)
          allPreviews.push(parsed.preview)
        }
      }

      setParsedRecords(allParsed)
      setPreviews(allPreviews)
      setStats(buildStats(allParsed))
      showToast(`解析成功：共识别 ${fileList.length} 个文件，${allParsed.length} 条记录`, 'success')
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
        <label>
          考试名称（可选，宽表建议填写）
          <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="例如：八上期末" />
        </label>
      </div>

      <div className="panel">
        <p>支持批量上传：长表（学生/考试/科目/分数）与宽表（学生+各科分数列）自动识别</p>
        <label>
          选择文件（可多选）
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const files = e.target.files
              if (files) {
                void handleFilesChange(files)
              }
            }}
          />
        </label>
      </div>

      {loading ? <p>正在解析文件...</p> : null}
      {errorMessage ? <p className="text-error">{errorMessage}</p> : null}
      {selectedFiles.length ? <p>已选择文件：{selectedFiles.join('、')}</p> : null}

      {stats ? (
        <div className="panel">
          <h3>解析结果</h3>
          <div className="stats-row">
            <span>学生数量：{stats.studentCount}</span>
            <span>考试数量：{stats.examCount}</span>
            <span>科目数量：{stats.subjectCount}</span>
            <span>总记录数：{stats.totalRecords}</span>
          </div>

          <h4>识别预览</h4>
          <table>
            <thead>
              <tr>
                <th>来源</th>
                <th>模式</th>
                <th>表头行</th>
                <th>记录数</th>
                <th>科目列</th>
                <th>忽略列</th>
              </tr>
            </thead>
            <tbody>
              {previews.map((item, index) => (
                <tr key={`${item.source}-${index}`}>
                  <td>{item.source}</td>
                  <td>{item.mode === 'long' ? '长表' : '宽表'}</td>
                  <td>第 {item.headerRow} 行</td>
                  <td>{item.recordCount}</td>
                  <td>{item.subjectColumns.join('、') || '无'}</td>
                  <td>{item.ignoredColumns.join('、') || '无'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="panel-title-row">
            <p>批量解析成功。</p>
            <button onClick={() => void handleSave()}>确认导入并进入班级分析</button>
          </div>
        </div>
      ) : (
        <EmptyState title="请上传成绩文件" description="支持单个或多个 CSV/Excel 文件，自动识别并合并导入。" />
      )}
    </section>
  )
}
