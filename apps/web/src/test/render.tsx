// Renders a component inside a stand-in app store. Only what a test passes is real; the rest are no-ops.
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, vi } from 'vitest'
import { AppContext, type AppState } from '../store/context'
import { DEFAULT_SETTINGS } from '../store/defaults'
import { bank, EMPTY_CUSTOM } from './fixtures'

afterEach(cleanup)

export function appState(patch: Partial<AppState> = {}): AppState {
  return {
    bank: bank([]),
    settings: DEFAULT_SETTINGS,
    updateSettings: vi.fn(),
    dictionary: [],
    findEntry: () => undefined,
    recordLookup: vi.fn(),
    setContextTranslation: vi.fn(),
    addEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntries: vi.fn(),
    restoreEntries: vi.fn(),
    replaceDictionary: vi.fn(),
    history: [],
    addAttempt: vi.fn(),
    deleteAttempt: vi.fn(),
    replaceHistory: vi.fn(),
    session: null,
    setSession: vi.fn(),
    customBank: EMPTY_CUSTOM,
    setCustomBank: vi.fn(),
    storageError: false,
    account: { enabled: false, user: null, status: 'off', signIn: vi.fn(), signOut: vi.fn() },
    resetAll: vi.fn(),
    ...patch,
  }
}

export function renderWithApp(ui: ReactElement, patch: Partial<AppState> = {}) {
  const state = appState(patch)
  return { state, ...render(<AppContext.Provider value={state}>{ui}</AppContext.Provider>) }
}
