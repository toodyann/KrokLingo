import { createContext, useContext } from 'react'

export type LookupFn = (word: string, anchor: HTMLElement) => void

export const LookupContext = createContext<LookupFn>(() => {})

export function useWordLookup(): LookupFn {
  return useContext(LookupContext)
}

export interface KnownWords {
  /** Dictionary words (lowercase base forms). */
  known: ReadonlySet<string>
  /** Word added most recently — gets the marker swipe animation. */
  justAdded: string | null
}

export const KnownWordsContext = createContext<KnownWords>({ known: new Set(), justAdded: null })

export function useKnownWords(): KnownWords {
  return useContext(KnownWordsContext)
}
