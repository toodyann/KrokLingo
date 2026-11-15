import { afterEach, describe, expect, it, vi } from 'vitest'
import { attempt, bank, entry, question } from '../test/fixtures'
import { createSession, finalizeSession, liveStats, mistakeIds, topicStats } from './session'

const qs = [question('q1'), question('q2', { correct: 2 }), question('q3', { topic: 'physiology', correct: 4 })]
const b = bank(qs)

const newSession = (timeLimitMin: number | null = null) =>
  createSession({
    mode: 'exam',
    title: 'Іспит',
    questions: qs,
    timeLimitMin,
    instantFeedback: false,
    threshold: 60,
    topics: [],
  })

afterEach(() => vi.useRealTimers())

describe('createSession', () => {
  it('starts unanswered, on the first question, with a shuffled order of every option', () => {
    const s = newSession()
    expect(s.id).toMatch(/^s/)
    expect(s.current).toBe(0)
    expect(s.answers).toEqual([null, null, null])
    expect(s.questions.map((q) => q.qid)).toEqual(['q1', 'q2', 'q3'])
    for (const q of s.questions) expect([...q.order].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it('sets a deadline only with a time limit', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    expect(newSession().deadline).toBeNull()
    expect(newSession(150).deadline).toBe(1_000_000 + 150 * 60_000)
  })
})

describe('liveStats', () => {
  it('counts answered and correct, with percent of answered', () => {
    const s = { ...newSession(), answers: [0, 1, null] }
    expect(liveStats(s, b)).toEqual({ total: 3, answered: 2, correct: 1, wrong: 1, percent: 50 })
  })

  it('is zero before any answer', () => {
    expect(liveStats(newSession(), b).percent).toBe(0)
  })
})

describe('finalizeSession', () => {
  it('scores skipped questions as wrong and decides pass / fail by the threshold', () => {
    vi.useFakeTimers({ now: 0 })
    const s = { ...newSession(), answers: [0, 2, null] }
    vi.setSystemTime(90_000)
    const r = finalizeSession(s, b, [], false)
    expect(r).toMatchObject({ total: 3, answered: 2, correct: 2, durationSec: 90, timedOut: false, passed: true })
    expect(r.percent).toBeCloseTo(66.67, 1)
    expect(r.items.map((i) => i.chosen)).toEqual([0, 2, null])

    expect(finalizeSession({ ...s, answers: [0, null, null] }, b, [], false).passed).toBe(false)
  })

  it('ends a timed-out exam at its deadline, not when the result was saved', () => {
    vi.useFakeTimers({ now: 0 })
    const s = newSession(1)
    vi.setSystemTime(5 * 60_000)
    const r = finalizeSession(s, b, [], true)
    expect(r.finishedAt).toBe(60_000)
    expect(r.durationSec).toBe(60)
    expect(r.timeLimitSec).toBe(60)
  })

  it('lists the words added during this session, oldest first', () => {
    const s = newSession()
    const dict = [
      entry('e1', 'molar', { sessionId: s.id, addedAt: 20, translation: 'моляр' }),
      entry('e2', 'other', { sessionId: 'elsewhere', addedAt: 10 }),
      entry('e3', 'enamel', { sessionId: s.id, addedAt: 10, translation: 'емаль' }),
    ]
    expect(finalizeSession(s, b, dict, false).newWords).toEqual([
      { word: 'enamel', translation: 'емаль' },
      { word: 'molar', translation: 'моляр' },
    ])
  })
})

describe('mistakeIds', () => {
  const item = (qid: string, chosen: number | null) => ({ qid, order: [0, 1, 2, 3, 4], chosen })

  it('keeps questions whose latest answer was wrong or skipped', () => {
    const history = [
      attempt('late', { finishedAt: 2, items: [item('q1', 0), item('q2', 0)] }),
      attempt('early', { finishedAt: 1, items: [item('q1', 3), item('q2', 2), item('q3', null)] }),
    ]
    expect(mistakeIds(history, b)).toEqual(new Set(['q2', 'q3']))
  })

  it('ignores questions in the other language and ones no longer in the bank', () => {
    const mixed = bank([...qs, question('u1', { collection: 'uk-col' })])
    const history = [attempt('a', { items: [item('u1', 3), item('gone', 3), item('q1', 3)] })]
    expect(mistakeIds(history, mixed)).toEqual(new Set(['q1']))
  })
})

describe('topicStats', () => {
  it('totals per topic in the bank’s topic order', () => {
    const history = [
      attempt('a', {
        items: [
          { qid: 'q3', order: [], chosen: 4 },
          { qid: 'q1', order: [], chosen: 0 },
          { qid: 'q2', order: [], chosen: 0 },
        ],
      }),
    ]
    expect(topicStats(history, b)).toEqual([
      { topic: 'anatomy', correct: 1, total: 2 },
      { topic: 'physiology', correct: 1, total: 1 },
    ])
  })
})
