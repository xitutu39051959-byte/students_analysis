import type { DatasetMeta } from '../../types/domain'

const ACTIVE_DATASET_KEY = 'sa_active_dataset_id'
const DATASETS_INDEX_KEY = 'sa_datasets_index'

export function getActiveDatasetId(): string | null {
  return localStorage.getItem(ACTIVE_DATASET_KEY)
}

export function setActiveDatasetId(datasetId: string | null): void {
  if (!datasetId) {
    localStorage.removeItem(ACTIVE_DATASET_KEY)
    return
  }
  localStorage.setItem(ACTIVE_DATASET_KEY, datasetId)
}

export function cacheDatasetIndex(datasets: DatasetMeta[]): void {
  localStorage.setItem(DATASETS_INDEX_KEY, JSON.stringify(datasets))
}

export function loadCachedDatasetIndex(): DatasetMeta[] {
  const raw = localStorage.getItem(DATASETS_INDEX_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as DatasetMeta[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
