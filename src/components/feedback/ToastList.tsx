import { useUiStore } from '../../store/uiStore'

export function ToastList() {
  const { toasts, removeToast } = useUiStore()

  return (
    <div className="toast-list" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} className={`toast ${toast.type}`} onClick={() => removeToast(toast.id)}>
          {toast.text}
        </button>
      ))}
    </div>
  )
}
