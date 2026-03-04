import type { AnalysisOptions, DatasetMeta, ScoreRecord } from '../../types/domain'

const DB_NAME = 'students_analysis_db'
const DB_VERSION = 1
const DATASETS_STORE = 'datasets'
const RECORDS_STORE = 'records'

interface RecordsEntity {
  datasetId: string
  records: ScoreRecord[]
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DATASETS_STORE)) {
        db.createObjectStore(DATASETS_STORE, { keyPath: 'datasetId' })
      }
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: 'datasetId' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listDatasetMeta(): Promise<DatasetMeta[]> {
  const db = await openDatabase()
  const tx = db.transaction(DATASETS_STORE, 'readonly')
  const store = tx.objectStore(DATASETS_STORE)
  const data = await requestToPromise(store.getAll())
  return (data as DatasetMeta[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getRecordsByDatasetId(datasetId: string): Promise<ScoreRecord[]> {
  const db = await openDatabase()
  const tx = db.transaction(RECORDS_STORE, 'readonly')
  const store = tx.objectStore(RECORDS_STORE)
  const data = (await requestToPromise(store.get(datasetId))) as RecordsEntity | undefined
  return data?.records ?? []
}

export async function saveDataset(meta: DatasetMeta, records: ScoreRecord[]): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction([DATASETS_STORE, RECORDS_STORE], 'readwrite')
  tx.objectStore(DATASETS_STORE).put(meta)
  tx.objectStore(RECORDS_STORE).put({ datasetId: meta.datasetId, records } satisfies RecordsEntity)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteDataset(datasetId: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction([DATASETS_STORE, RECORDS_STORE], 'readwrite')
  tx.objectStore(DATASETS_STORE).delete(datasetId)
  tx.objectStore(RECORDS_STORE).delete(datasetId)

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllDatasets(): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction([DATASETS_STORE, RECORDS_STORE], 'readwrite')
  tx.objectStore(DATASETS_STORE).clear()
  tx.objectStore(RECORDS_STORE).clear()

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const SETTINGS_KEY = 'sa_analysis_settings'

export function loadAnalysisSettings(defaults: AnalysisOptions): AnalysisOptions {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) {
    return defaults
  }

  try {
    return { ...defaults, ...JSON.parse(raw) } as AnalysisOptions
  } catch {
    return defaults
  }
}

export function saveAnalysisSettings(value: AnalysisOptions): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
}
