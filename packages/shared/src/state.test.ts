import { describe, expect, it } from 'vitest'
import { EMPTY_STATE, isEmptyState, mergeStates, type UserState } from './state.ts'
import type { AttemptRecord, DictEntry } from './types.ts'

const entry = (id: string, word: string, updatedAt: number, translation = 'x'): DictEntry => ({
  id,
  word,
  translation,
  note: '',
  source: 'builtin',
  addedAt: updatedAt,
  updatedAt,
  lookups: 1,
  learned: false,
  box: 0,
})
const attempt = (id: string, finishedAt: number) => ({ id, finishedAt }) as AttemptRecord

describe('mergeStates (first sign-in)', () => {
  it('unites lists by id and keeps the newer copy', () => {
    const server: UserState = { ...EMPTY_STATE, dictionary: [entry('a', 'tooth', 1, 'старе')], history: [attempt('h1', 10)] }
    const local: UserState = { ...EMPTY_STATE, dictionary: [entry('a', 'tooth', 5, 'нове'), entry('b', 'pulp', 2)], history: [attempt('h2', 20), attempt('h1', 10)] }
    const m = mergeStates(server, local)
    expect(m.dictionary.map((e) => `${e.word}:${e.translation}`)).toEqual(['tooth:нове', 'pulp:x'])
    expect(m.history.map((r) => r.id)).toEqual(['h1', 'h2'])
  })

  it('keeps one entry per word when both sides saved it under different ids', () => {
    const m = mergeStates({ ...EMPTY_STATE, dictionary: [entry('s', 'enamel', 3)] }, { ...EMPTY_STATE, dictionary: [entry('l', 'enamel', 7)] })
    expect(m.dictionary).toHaveLength(1)
    expect(m.dictionary[0].id).toBe('l')
  })

  it('prefers the account for single values and falls back to the browser', () => {
    const local: UserState = { ...EMPTY_STATE, settings: { threshold: 50 } }
    expect(mergeStates({ ...EMPTY_STATE, settings: { threshold: 60 } }, local).settings).toEqual({ threshold: 60 })
    expect(mergeStates(EMPTY_STATE, local).settings).toEqual({ threshold: 50 })
  })

  it('detects an empty state', () => {
    expect(isEmptyState(EMPTY_STATE)).toBe(true)
    expect(isEmptyState({ ...EMPTY_STATE, history: [attempt('h', 1)] })).toBe(false)
    expect(isEmptyState({ ...EMPTY_STATE, customBank: { collections: [], questions: [], passages: [] } })).toBe(true)
  })
})
