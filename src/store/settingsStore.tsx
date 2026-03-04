import { createContext, useContext, useMemo, useState } from 'react'
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions } from '../types/domain'
import { loadAnalysisSettings, saveAnalysisSettings } from '../services/storage/indexedDb'

interface SettingsStore {
  options: AnalysisOptions
  save: (next: AnalysisOptions) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsStore | null>(null)

export function SettingsStoreProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<AnalysisOptions>(() => loadAnalysisSettings(DEFAULT_ANALYSIS_OPTIONS))

  const value = useMemo<SettingsStore>(
    () => ({
      options,
      save: (next) => {
        setOptions(next)
        saveAnalysisSettings(next)
      },
      reset: () => {
        setOptions(DEFAULT_ANALYSIS_OPTIONS)
        saveAnalysisSettings(DEFAULT_ANALYSIS_OPTIONS)
      },
    }),
    [options],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettingsStore(): SettingsStore {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettingsStore must be used inside SettingsStoreProvider')
  }
  return ctx
}
