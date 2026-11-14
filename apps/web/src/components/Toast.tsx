import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from './toastContext'

interface ActiveToast extends ToastOptions {
  id: number
}

const DURATION = 5000

/** Non-blocking feedback with undo — instead of confirmation alerts for reversible actions. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((opts: ToastOptions) => {
    clearTimeout(timer.current)
    setToast({ ...opts, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), DURATION)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.onAction?.()
                  clearTimeout(timer.current)
                  setToast(null)
                }}
              >
                {toast.actionLabel ?? 'Скасувати'}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
