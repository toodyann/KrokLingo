import { createContext, useContext } from 'react'
import type { ClickContext } from '../lib/translate'

export type LookupFn = (click: ClickContext, anchor: HTMLElement) => void

export const LookupContext = createContext<LookupFn>(() => {})

export function useWordLookup(): LookupFn {
  return useContext(LookupContext)
}

export interface KnownWords {
  /** Dictionary keys (lowercase base forms and phrases). */
  known: ReadonlySet<string>
  /** Key added most recently — gets the marker swipe animation. */
  justAdded: string | null
}

export const KnownWordsContext = createContext<KnownWords>({ known: new Set(), justAdded: null })

export function useKnownWords(): KnownWords {
  return useContext(KnownWordsContext)
}
