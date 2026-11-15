import { createContext, useContext } from 'react'
import type {
  ActiveSession,
  AttemptRecord,
  Collection,
  CustomBank,
  DictEntry,
  Lang,
  Passage,
  Question,
  Settings,
  Topic,
} from '../types'
import type { Resolution } from '../lib/translate'
import type { Account } from './useCloudSync'

export interface Bank {
  topics: Topic[]
  /** Collections and questions in the chosen question language: what tests are drawn from. */
  collections: Collection[]
  questions: Question[]
  passages: Passage[]
  /** Lookups cover every language, so history and results always resolve. */
  questionById: Map<string, Question>
  passageById: Map<string, Passage>
  collectionById: Map<string, Collection>
  topicName: (id: string) => string
  /** The question language in use and the languages the bank has, with question counts. */
  lang: Lang
  langs: { lang: Lang; count: number }[]
  langOf: (q: Question) => Lang
}

export interface AppState {
  bank: Bank
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  dictionary: DictEntry[]
  findEntry: (word: string) => DictEntry | undefined
  /** Saves a clicked unit with its context; never overwrites the user's own translation. */
  recordLookup: (resolution: Resolution) => DictEntry
  /** The user's translation for one question (null removes it). */
  setContextTranslation: (id: string, contextId: string, translation: string | null) => void
  addEntry: (word: string, translation: string, note?: string) => DictEntry
  updateEntry: (id: string, patch: Partial<DictEntry>) => void
  deleteEntries: (ids: string[]) => void
  /** Puts previously deleted entries back (undo). */
  restoreEntries: (entries: DictEntry[]) => void
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

  /** Google account and server sync (disabled when the build has no sync configuration). */
  account: Account
  /** Deletes all user data here and, when signed in, in the account. */
  resetAll: () => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
