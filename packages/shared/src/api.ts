// HTTP contract between the web app and the API. All routes except /health need
// "Authorization: Bearer <Supabase access token>".

import type { ActiveSession, AttemptRecord, CustomBank, DictEntry, Settings } from './types.ts'
import type { UserState } from './state.ts'

export const API_ROUTES = {
  health: '/health',
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
