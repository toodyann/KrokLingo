import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  /** Label of the undo-style action, e.g. "Скасувати". */
  actionLabel?: string
  onAction?: () => void
}

export const ToastContext = createContext<(toast: ToastOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}
