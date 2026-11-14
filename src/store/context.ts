import { createContext, useContext } from 'react'
import type {
  ActiveSession,
  AttemptRecord,
  Collection,
  CustomBank,
  DictEntry,
  Passage,
  Question,
  Settings,
  Topic,
  TranslationSource,
} from '../types'

export interface Bank {
  topics: Topic[]
  collections: Collection[]
  questions: Question[]
  passages: Passage[]
  questionById: Map<string, Question>
  passageById: Map<string, Passage>
  topicName: (id: string) => string
}

export interface AppState {
  bank: Bank
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  dictionary: DictEntry[]
  findEntry: (word: string) => DictEntry | undefined
  recordLookup: (word: string, translation: string, source: TranslationSource) => DictEntry
  addEntry: (word: string, translation: string, note?: string) => DictEntry
  updateEntry: (id: string, patch: Partial<DictEntry>) => void
  deleteEntries: (ids: string[]) => void
  replaceDictionary: (entries: DictEntry[]) => void

  history: AttemptRecord[]
  addAttempt: (record: AttemptRecord) => void
  deleteAttempt: (id: string) => void
  replaceHistory: (records: AttemptRecord[]) => void

  session: ActiveSession | null
  setSession: (next: ActiveSession | null | ((prev: ActiveSession | null) => ActiveSession | null)) => void

  customBank: CustomBank
  setCustomBank: (bank: CustomBank) => void

  storageError: boolean
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
