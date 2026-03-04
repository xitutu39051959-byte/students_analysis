import { useEffect } from 'react'
import { DatasetStoreProvider, useDatasetStore } from '../../store/datasetStore'
import { SettingsStoreProvider } from '../../store/settingsStore'
import { UiStoreProvider } from '../../store/uiStore'

function Bootstrap({ children }: { children: React.ReactNode }) {
  const { refresh } = useDatasetStore()

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <>{children}</>
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UiStoreProvider>
      <SettingsStoreProvider>
        <DatasetStoreProvider>
          <Bootstrap>{children}</Bootstrap>
        </DatasetStoreProvider>
      </SettingsStoreProvider>
    </UiStoreProvider>
  )
}
