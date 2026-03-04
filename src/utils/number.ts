export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function toNumber(input: string | number | null): number | null {
  if (input === null) {
    return null
  }
  const num = typeof input === 'number' ? input : Number(String(input).trim())
  if (Number.isNaN(num)) {
    return null
  }
  return num
}
