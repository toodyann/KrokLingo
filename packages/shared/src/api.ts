// HTTP contract between the web app and the API. All routes except /health and /api/bank need
// "Authorization: Bearer <Supabase access token>".

import type { ActiveSession, AttemptRecord, Collection, CustomBank, DictEntry, Passage, Settings } from './types.ts'
import type { UserState } from './state.ts'

export const API_ROUTES = {
  health: '/health',
  /** GET (public) → BankPayload; send If-None-Match with the last ETag to get 304 when unchanged */
  bank: '/api/bank',
  /** GET → UserState */
  state: '/api/state',
  /** PUT { state: UserState } → replaces everything (first sign-in merge, restore from backup) */
  replaceState: '/api/state',
  /** PUT { settings } */
  settings: '/api/settings',
  /** PUT /api/dictionary/:id { entry } · DELETE /api/dictionary/:id */
  dictionaryEntry: (id: string) => `/api/dictionary/${encodeURIComponent(id)}`,
  /** PUT /api/history/:id { record } · DELETE /api/history/:id */
  attempt: (id: string) => `/api/history/${encodeURIComponent(id)}`,
  /** PUT { session: ActiveSession | null } */
  session: '/api/session',
  /** PUT { customBank } */
  customBank: '/api/custom-bank',
} as const

export interface StateBody {
  state: UserState
}
export interface SettingsBody {
  settings: Partial<Settings>
}
export interface EntryBody {
  entry: DictEntry
}
export interface AttemptBody {
  record: AttemptRecord
}
export interface SessionBody {
  session: ActiveSession | null
}
export interface CustomBankBody {
  customBank: CustomBank
}

/** One question in the bank payload: [id, collection, topic, text, options, correct, passageId, explanation]. */
export type BankRow = [string, string, string, string, string[], number, (string | null)?, (string | null)?]

/** The shared question bank, in display order. */
export interface BankPayload {
  /** Content hash; also the ETag. */
  version: string
  collections: Collection[]
  passages: Passage[]
  questions: BankRow[]
}
