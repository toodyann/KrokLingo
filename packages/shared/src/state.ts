import type { ActiveSession, AttemptRecord, CustomBank, DictEntry, Settings } from './types.ts'

/** Everything a user keeps: what the web app used to hold only in localStorage. */
export interface UserState {
  settings: Partial<Settings> | null
  dictionary: DictEntry[]
  history: AttemptRecord[]
  session: ActiveSession | null
  customBank: CustomBank | null
}

export const EMPTY_STATE: UserState = {
  settings: null,
  dictionary: [],
  history: [],
  session: null,
  customBank: null,
}

export function isEmptyState(s: UserState): boolean {
  return (
    !s.settings &&
    s.dictionary.length === 0 &&
    s.history.length === 0 &&
    !s.session &&
    !(s.customBank && (s.customBank.collections.length || s.customBank.questions.length))
  )
}

/** Union of two lists by id; for the same id the more recently updated copy wins. */
function unionById<T extends { id: string }>(a: T[], b: T[], updated: (x: T) => number): T[] {
  const byId = new Map<string, T>()
  for (const x of [...a, ...b]) {
    const prev = byId.get(x.id)
    if (!prev || updated(x) > updated(prev)) byId.set(x.id, x)
  }
  return [...byId.values()]
}

/**
 * Merges data from this browser into the account on the first sign-in, so nothing collected before
 * signing in is lost. The server copy wins for single values (settings, custom bank); lists are united.
 * The unfinished test of the browser is kept only when the account has none.
 */
export function mergeStates(server: UserState, local: UserState): UserState {
  const dictionary = unionById(server.dictionary, local.dictionary, (e) => e.updatedAt ?? 0)
  // one entry per word: when both sides added the same word under different ids, keep the newer
  const byWord = new Map<string, DictEntry>()
  for (const e of dictionary) {
    const prev = byWord.get(e.word)
    if (!prev || (e.updatedAt ?? 0) > (prev.updatedAt ?? 0)) byWord.set(e.word, e)
  }
  const customBank = server.customBank ?? local.customBank
  return {
    settings: server.settings ?? local.settings,
    dictionary: [...byWord.values()].sort((x, y) => y.addedAt - x.addedAt),
    history: unionById(server.history, local.history, (r) => r.finishedAt).sort((x, y) => x.finishedAt - y.finishedAt),
    session: server.session ?? local.session,
    customBank,
  }
}
