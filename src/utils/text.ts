export function normalizeText(input: string | number | null): string {
  if (input === null || input === undefined) {
    return ''
  }
  return String(input).trim()
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}
