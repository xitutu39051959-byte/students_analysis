import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  deleteDataset as deleteDatasetFromDb,
  getRecordsByDatasetId,
  listDatasetMeta,
  saveDataset,
} from '../services/storage/indexedDb'
import {
  cacheDatasetIndex,
  getActiveDatasetId,
  loadCachedDatasetIndex,
  setActiveDatasetId,
} from '../services/storage/localCache'
import { logError } from '../services/logger/appLogger'
import type { DatasetMeta, ScoreRecord } from '../types/domain'
import { unique } from '../utils/text'

interface DatasetState {
  datasets: DatasetMeta[]
  activeDatasetId: string | null
  activeRecords: ScoreRecord[]
  loading: boolean
}

interface DatasetStore extends DatasetState {
  refresh: () => Promise<void>
  setActive: (datasetId: string) => Promise<void>
  importDataset: (params: {
    datasetName: string
    className: string
    term: string
    records: ScoreRecord[]
  }) => Promise<string>
  deleteDataset: (datasetId: string) => Promise<void>
}

const DatasetStoreContext = createContext<DatasetStore | null>(null)

function buildMeta(datasetId: string, datasetName: string, className: string, term: string, records: ScoreRecord[]): DatasetMeta {
  const exams = unique(records.map((record) => `${record.exam}__${record.examDate}`))
  const students = unique(records.map((record) => record.student))
  const subjects = unique(records.map((record) => record.subject))

  return {
    datasetId,
    datasetName,
    className,
    term,
    createdAt: new Date().toISOString(),
    recordCount: records.length,
    examCount: exams.length,
    studentCount: students.length,
    subjectCount: subjects.length,
  }
}

export function DatasetStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatasetState>({
    datasets: loadCachedDatasetIndex(),
    activeDatasetId: getActiveDatasetId(),
    activeRecords: [],
    loading: true,
  })

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      const datasets = await listDatasetMeta()
      cacheDatasetIndex(datasets)

      const cachedActive = getActiveDatasetId()
      const fallbackActive = datasets[0]?.datasetId ?? null
      const activeDatasetId = cachedActive && datasets.some((item) => item.datasetId === cachedActive) ? cachedActive : fallbackActive

      if (activeDatasetId) {
        setActiveDatasetId(activeDatasetId)
      }

      const activeRecords = activeDatasetId ? await getRecordsByDatasetId(activeDatasetId) : []

      setState({
        datasets,
        activeDatasetId,
        activeRecords,
        loading: false,
      })
    } catch (error) {
      logError('刷新数据集失败', error)
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  const setActive = useCallback(async (datasetId: string) => {
    setActiveDatasetId(datasetId)
    const activeRecords = await getRecordsByDatasetId(datasetId)
    setState((prev) => ({ ...prev, activeDatasetId: datasetId, activeRecords }))
  }, [])

  const importDataset = useCallback(
    async (params: { datasetName: string; className: string; term: string; records: ScoreRecord[] }) => {
      const datasetId = crypto.randomUUID()
      const meta = buildMeta(datasetId, params.datasetName, params.className, params.term, params.records)
      await saveDataset(meta, params.records)
      await refresh()
      await setActive(datasetId)
      return datasetId
    },
    [refresh, setActive],
  )

  const deleteDataset = useCallback(
    async (datasetId: string) => {
      await deleteDatasetFromDb(datasetId)
      if (state.activeDatasetId === datasetId) {
        setActiveDatasetId(null)
      }
      await refresh()
    },
    [refresh, state.activeDatasetId],
  )

  const value = useMemo(
    () => ({ ...state, refresh, setActive, importDataset, deleteDataset }),
    [state, refresh, setActive, importDataset, deleteDataset],
  )

  return <DatasetStoreContext.Provider value={value}>{children}</DatasetStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDatasetStore(): DatasetStore {
  const ctx = useContext(DatasetStoreContext)
  if (!ctx) {
    throw new Error('useDatasetStore must be used inside DatasetStoreProvider')
  }
  return ctx
}
