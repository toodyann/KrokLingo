import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BUILTIN_BANK } from '../data/bank'
import { STORAGE_KEYS, loadJSON, saveJSON } from '../lib/storage'
import { uid } from '../lib/util'
import type { ActiveSession, AttemptRecord, CustomBank, DictEntry, Settings, TranslationSource } from '../types'
import { AppContext, type AppState, type Bank } from './context'
import { DEFAULT_SETTINGS } from './defaults'

const EMPTY_BANK: CustomBank = { collections: [], questions: [], passages: [] }

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

  const bank = useMemo<Bank>(() => {
    const topics = [...BUILTIN_BANK.topics]
    const knownTopics = new Set(topics.map((t) => t.id))
    for (const q of customBank.questions) {
      if (!knownTopics.has(q.topic)) {
        knownTopics.add(q.topic)
        topics.push({ id: q.topic, name: q.topic })
      }
    }
    const collections = [...BUILTIN_BANK.collections, ...customBank.collections]
    const questions = [...BUILTIN_BANK.questions, ...customBank.questions]
    const passages = [...BUILTIN_BANK.passages, ...customBank.passages]
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
  }, [customBank])

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

  const recordLookup = useCallback(
    (word: string, translation: string, source: TranslationSource): DictEntry => {
      const key = word.toLowerCase()
      const now = Date.now()
      const existing = dictionary.find((e) => e.word.toLowerCase() === key)
      if (existing) {
        const updated: DictEntry = {
          ...existing,
          lookups: existing.lookups + 1,
          // fill a missing translation, but never overwrite the user's own edits
          ...(existing.translation ? {} : translation ? { translation, source, updatedAt: now } : {}),
        }
        setDictionary((prev) => prev.map((e) => (e.id === existing.id ? updated : e)))
        return updated
      }
      const entry: DictEntry = {
        id: uid('w'),
        word: key,
        translation,
        note: '',
        source,
        addedAt: now,
        updatedAt: now,
        sessionId: sessionIdRef.current,
        lookups: 1,
        learned: false,
        box: 0,
      }
      setDictionary((prev) => [entry, ...prev])
      return entry
    },
    [dictionary, setDictionary],
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
    addEntry,
    updateEntry,
    deleteEntries,
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
