import { createContext, useContext } from 'react'

export type LookupFn = (word: string, anchor: HTMLElement) => void

export const LookupContext = createContext<LookupFn>(() => {})

export function useWordLookup(): LookupFn {
  return useContext(LookupContext)
}
