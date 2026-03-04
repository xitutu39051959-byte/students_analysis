export function logInfo(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.info(`[students-analysis] ${message}`)
    return
  }
  console.info(`[students-analysis] ${message}`, payload)
}

export function logError(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.error(`[students-analysis] ${message}`)
    return
  }
  console.error(`[students-analysis] ${message}`, payload)
}
