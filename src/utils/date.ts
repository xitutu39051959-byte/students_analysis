export function toIsoDate(input: string): string | null {
  const text = input.trim()
  if (!text) {
    return null
  }

  const normalized = text.replace(/\./g, '-').replace(/\//g, '-')
  const timestamp = Date.parse(normalized)
  if (Number.isNaN(timestamp)) {
    return null
  }

  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function compareIsoDate(a: string, b: string): number {
  return a.localeCompare(b)
}
