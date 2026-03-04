export const CANONICAL_COLUMNS = ['学生', '考试', '考试日期', '科目', '分数', '班级', '学期'] as const

export const COLUMN_ALIASES: Record<(typeof CANONICAL_COLUMNS)[number], string[]> = {
  学生: ['学生', '姓名'],
  考试: ['考试', '考试名称'],
  考试日期: ['考试日期', '日期'],
  科目: ['科目', '学科'],
  分数: ['分数', '成绩'],
  班级: ['班级'],
  学期: ['学期'],
}

const REQUIRED_COLUMNS = ['学生', '考试', '考试日期', '科目', '分数'] as const

export function buildColumnMapping(headers: string[]): {
  mapping: Record<string, string>
  missingRequiredColumns: string[]
} {
  const mapping: Record<string, string> = {}

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const hit = headers.find((header) => aliases.includes(header.trim()))
    if (hit) {
      mapping[canonical] = hit
    }
  }

  const missingRequiredColumns = REQUIRED_COLUMNS.filter((column) => !mapping[column])
  return { mapping, missingRequiredColumns }
}
