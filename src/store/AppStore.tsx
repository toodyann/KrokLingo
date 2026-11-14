import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BUILTIN_BANK } from '../data/bank'
import { STORAGE_KEYS, loadJSON, saveJSON } from '../lib/storage'
import { uid } from '../lib/util'
import { refreshedTranslation, storedText, type Resolution } from '../lib/translate'
import type { ActiveSession, AttemptRecord, CustomBank, DictEntry, Settings, TranslationSource } from '../types'
import { AppContext, type AppState, type Bank } from './context'
import { DEFAULT_SETTINGS } from './defaults'

const EMPTY_BANK: CustomBank = { collections: [], questions: [], passages: [] }

// The booklet bank (~2,400 items) lives in its own chunk; loading starts as soon as the app boots.
const bookletsPromise = import('../data/booklets').then((m) => m.loadBooklets())

function usePersistent<T>(key: string, initial: T, onError: () => void) {
  const [value, setValue] = useState<T>(() => loadJSON<T>(key, initial))
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!saveJSON(key, value)) onError()
  }, [key, value, onError])
  return [value, setValue] as const
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [storageError, setStorageError] = useState(false)
  const onError = useCallback(() => setStorageError(true), [])

  const [storedSettings, setSettings] = usePersistent<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS, onError)
  const [dictionary, setDictionary] = usePersistent<DictEntry[]>(STORAGE_KEYS.dictionary, [], onError)
  const [history, setHistory] = usePersistent<AttemptRecord[]>(STORAGE_KEYS.history, [], onError)
  const [session, setSession] = usePersistent<ActiveSession | null>(STORAGE_KEYS.session, null, onError)
  const [customBank, setCustomBank] = usePersistent<CustomBank>(STORAGE_KEYS.customBank, EMPTY_BANK, onError)

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...storedSettings }), [storedSettings])
  const booklets = use(bookletsPromise)

  const bank = useMemo<Bank>(() => {
    const topics = [...BUILTIN_BANK.topics]
    const knownTopics = new Set(topics.map((t) => t.id))
    for (const q of customBank.questions) {
      if (!knownTopics.has(q.topic)) {
        knownTopics.add(q.topic)
        topics.push({ id: q.topic, name: q.topic })
      }
    }
    const collections = [...BUILTIN_BANK.collections, ...booklets.collections, ...customBank.collections]
    const questions = [...BUILTIN_BANK.questions, ...booklets.questions, ...customBank.questions]
    const passages = [...BUILTIN_BANK.passages, ...booklets.passages, ...customBank.passages]
    const topicNames = new Map(topics.map((t) => [t.id, t.name]))
    return {
      topics,
      collections,
      questions,
      passages,
      questionById: new Map(questions.map((q) => [q.id, q])),
      passageById: new Map(passages.map((p) => [p.id, p])),
      topicName: (id: string) => topicNames.get(id) ?? id,
    }
  }, [booklets, customBank])

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch })),
    [setSettings],
  )

  const findEntry = useCallback(
    (word: string) => {
      const key = word.toLowerCase()
      return dictionary.find((e) => e.word.toLowerCase() === key)
    },
    [dictionary],
  )

  // Keep the latest session id in a ref so lookups made during a test are tagged with it.
  const sessionIdRef = useRef<string | undefined>(session?.id)
  useLayoutEffect(() => {
    sessionIdRef.current = session?.id
  }, [session?.id])

  // Built-in data may have changed since entries were saved: refresh automatic translations once per
  // load. The user's own ('manual') translations and per-question overrides are never touched.
  useEffect(() => {
    setDictionary((prev) => {
      let changed = false
      const next = prev.map((e) => {
        const fresh = refreshedTranslation(e)
        if (!fresh || fresh.translation === e.translation) return e
        changed = true
        return { ...e, translation: fresh.translation, certainty: fresh.certainty, origin: fresh.origin, source: 'builtin' as const }
      })
      return changed ? next : prev
    })
  }, [setDictionary])

  const recordLookup = useCallback(
    (res: Resolution): DictEntry => {
      const key = res.key.toLowerCase()
      const now = Date.now()
      const source: TranslationSource = res.source === 'online' ? 'online' : res.translation ? 'builtin' : 'none'
      const existing = dictionary.find((e) => e.word.toLowerCase() === key)
      if (existing) {
        // Keep the entry stable: an automatic translation is replaced only by a translation for the
        // same context (e.g. after a data update) or when it had none. The user's own text stays.
        const auto = existing.source !== 'manual'
        const sameContext = existing.contextId === res.contextId
        const replace =
          auto && !!res.translation && res.source !== 'user' && res.source !== 'user-context' && (!existing.translation || sameContext)
        const updated: DictEntry = {
          ...existing,
          lookups: existing.lookups + 1,
          surface: existing.surface ?? res.clicked,
          context: existing.context ?? res.sentence,
          contextId: existing.contextId ?? res.contextId,
          kind: existing.kind ?? res.kind,
          ...(replace
            ? { translation: storedText(res), source, origin: res.source, certainty: res.certainty, updatedAt: now }
            : {}),
        }
        setDictionary((prev) => prev.map((e) => (e.id === existing.id ? updated : e)))
        return updated
      }
      const entry: DictEntry = {
        id: uid('w'),
        word: key,
        translation: storedText(res),
        note: '',
        source,
        addedAt: now,
        updatedAt: now,
        sessionId: sessionIdRef.current,
        lookups: 1,
        learned: false,
        box: 0,
        surface: res.clicked,
        context: res.sentence,
        contextId: res.contextId,
        kind: res.kind,
        origin: res.source,
        certainty: res.certainty,
      }
      setDictionary((prev) => [entry, ...prev])
      return entry
    },
    [dictionary, setDictionary],
  )

  const setContextTranslation = useCallback(
    (id: string, contextId: string, translation: string | null) =>
      setDictionary((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e
          const contextual = { ...e.contextual }
          if (translation) contextual[contextId] = translation
          else delete contextual[contextId]
          return { ...e, contextual: Object.keys(contextual).length ? contextual : undefined, updatedAt: Date.now() }
        }),
      ),
    [setDictionary],
  )

  const addEntry = useCallback(
    (word: string, translation: string, note = ''): DictEntry => {
      const now = Date.now()
      const entry: DictEntry = {
        id: uid('w'),
        word: word.trim().toLowerCase(),
        translation: translation.trim(),
        note: note.trim(),
        source: 'manual',
        addedAt: now,
        updatedAt: now,
        lookups: 0,
        learned: false,
        box: 0,
      }
      setDictionary((prev) => [entry, ...prev])
      return entry
    },
    [setDictionary],
  )

  const updateEntry = useCallback(
    (id: string, patch: Partial<DictEntry>) =>
      setDictionary((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e))),
    [setDictionary],
  )

  const deleteEntries = useCallback(
    (ids: string[]) => {
      const set = new Set(ids)
      setDictionary((prev) => prev.filter((e) => !set.has(e.id)))
    },
    [setDictionary],
  )

  const restoreEntries = useCallback(
    (entries: DictEntry[]) =>
      setDictionary((prev) => {
        const present = new Set(prev.map((e) => e.id))
        return [...entries.filter((e) => !present.has(e.id)), ...prev].sort((a, b) => b.addedAt - a.addedAt)
      }),
    [setDictionary],
  )

  const addAttempt = useCallback(
    (record: AttemptRecord) => setHistory((prev) => [...prev, record]),
    [setHistory],
  )

  const deleteAttempt = useCallback(
    (id: string) => setHistory((prev) => prev.filter((r) => r.id !== id)),
    [setHistory],
  )

  const value: AppState = {
    bank,
    settings,
    updateSettings,
    dictionary,
    findEntry,
    recordLookup,
    setContextTranslation,
    addEntry,
    updateEntry,
    deleteEntries,
    restoreEntries,
    replaceDictionary: setDictionary,
    history,
    addAttempt,
    deleteAttempt,
    replaceHistory: setHistory,
    session,
    setSession,
    customBank,
    setCustomBank,
    storageError,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
