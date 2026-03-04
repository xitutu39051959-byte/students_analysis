import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ToastMessage, ToastType } from '../types/ui'

interface UiStore {
  toasts: ToastMessage[]
  showToast: (text: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

const UiContext = createContext<UiStore | null>(null)

export function UiStoreProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback(
    (text: string, type: ToastType = 'info') => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, text, type }])
      window.setTimeout(() => removeToast(id), 3000)
    },
    [removeToast],
  )

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast])

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUiStore(): UiStore {
  const ctx = useContext(UiContext)
  if (!ctx) {
    throw new Error('useUiStore must be used inside UiStoreProvider')
  }
  return ctx
}
