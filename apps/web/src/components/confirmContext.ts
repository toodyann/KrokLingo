import { createContext, useContext, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  /** Label of the confirming button. */
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirming button for destructive actions. */
  destructive?: boolean
}

/** Resolves to true when the user confirms, false when they cancel or dismiss the dialog. */
export type Confirm = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<Confirm>(() => Promise.resolve(false))

/** In-app replacement for window.confirm(), styled like the rest of the UI. */
export function useConfirm(): Confirm {
  return useContext(ConfirmContext)
}

/** Starting a new test replaces the unfinished one. */
export function discardSessionOptions(question: string): ConfirmOptions {
  return {
    title: 'Є незавершений тест',
    description: `Його буде скасовано, а відповіді втрачено. ${question}`,
    confirmLabel: 'Почати новий',
    cancelLabel: 'Скасувати',
    destructive: true,
  }
}
