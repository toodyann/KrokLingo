import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_STATE, type UserState } from '@kroklingo/shared'
import type { AttemptRecord, DictEntry } from '../../types'
import { createApi, diffState, SyncError } from './sync'

const entry = (id: string, word: string): DictEntry => ({
  id,
  word,
  translation: '',
  note: '',
  source: 'builtin',
  addedAt: 1,
  updatedAt: 1,
  lookups: 1,
  learned: false,
  box: 0,
})
const attempt = (id: string) => ({ id, finishedAt: 1 }) as AttemptRecord

describe('diffState', () => {
  const a = entry('a', 'tooth')
  const b = entry('b', 'pulp')
  const base: UserState = { ...EMPTY_STATE, settings: { threshold: 40 }, dictionary: [a, b], history: [attempt('h1')] }

  it('sends nothing when nothing changed', () => {
    expect(diffState(base, { ...base })).toEqual([])
  })

  it('sends only the changed, new and removed records', () => {
    const changed = { ...a, translation: 'зуб' }
    const next: UserState = {
      ...base,
      dictionary: [changed, entry('c', 'gum')],
      history: [...base.history, attempt('h2')],
    }
    expect(diffState(base, next)).toEqual([
      { kind: 'entry', entry: changed },
      { kind: 'entry', entry: next.dictionary[1] },
      { kind: 'entry-delete', id: 'b' },
      { kind: 'attempt', record: next.history[1] },
    ])
  })

  it('sends settings, the unfinished test and imported collections when replaced', () => {
    const session = { id: 's1' } as UserState['session']
    const next: UserState = {
      ...base,
      settings: { threshold: 50 },
      session,
      customBank: { collections: [], questions: [], passages: [] },
    }
    expect(diffState(base, next).map((o) => o.kind)).toEqual(['settings', 'session', 'custom-bank'])
    expect(diffState(next, { ...next, session: null })).toEqual([{ kind: 'session', session: null }])
  })

  it('replaces the whole state for large changes and for "delete all data"', () => {
    const many: UserState = { ...base, dictionary: Array.from({ length: 80 }, (_, i) => entry(`n${i}`, `w${i}`)) }
    expect(diffState(base, many).map((o) => o.kind)).toEqual(['state'])
    expect(diffState(base, EMPTY_STATE)).toEqual([{ kind: 'state', state: EMPTY_STATE }])
  })
})

describe('createApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('calls the API with the access token and the right route', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const api = createApi('https://api.example', async () => 'tok')
    await api.send({ kind: 'entry', entry: entry('w 1', 'tooth') })
    await api.send({ kind: 'attempt-delete', id: 'h1' })
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls[0][0]).toBe('https://api.example/api/dictionary/w%201')
    expect(calls[0][1].method).toBe('PUT')
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(calls[1][0]).toBe('https://api.example/api/history/h1')
    expect(calls[1][1].method).toBe('DELETE')
  })

  it('fails without a session and on HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    await expect(createApi('https://api.example', async () => null).getState()).rejects.toBeInstanceOf(SyncError)
    await expect(createApi('https://api.example', async () => 'tok').getState()).rejects.toMatchObject({ status: 500 })
  })
})
