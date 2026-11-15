import { describe, expect, it } from 'vitest'
import { at, attempt, bank, entry, question } from '../test/fixtures'
import {
  activitySeries,
  attemptSeries,
  periodRange,
  previousRange,
  startOfDay,
  streakDays,
  summarize,
  topicSeries,
} from './stats'

const NOW = at(2026, 3, 15, 18)

describe('periodRange', () => {
  it('covers the last N whole days, today included', () => {
    const r = periodRange(7, [], [], NOW)
    expect(r.days).toBe(7)
    expect(r.to).toBe(at(2026, 3, 16, 0))
    expect(r.from).toBe(at(2026, 3, 9, 0))
  })

  it('"all" starts at the first activity, but spans at least a week', () => {
    const history = [attempt('a', { finishedAt: at(2026, 1, 15) })]
    const words = [entry('e', 'molar', { addedAt: at(2026, 2, 1) })]
    expect(periodRange('all', history, words, NOW)).toMatchObject({ from: at(2026, 1, 15, 0), days: 60 })
    expect(periodRange('all', [attempt('b', { finishedAt: NOW })], [], NOW).days).toBe(7)
    expect(periodRange('all', [], [], NOW).days).toBe(30)
  })

  it('previousRange is the same length right before', () => {
    const r = periodRange(7, [], [], NOW)
    expect(previousRange(r)).toEqual({ from: at(2026, 3, 2, 0), to: r.from, days: 7 })
  })
})

describe('summarize', () => {
  it('adds up attempts in range; skipped questions lower accuracy', () => {
    const r = periodRange(7, [], [], NOW)
    const history = [
      attempt('in', { finishedAt: at(2026, 3, 14), total: 10, answered: 8, correct: 6, durationSec: 300 }),
      attempt('in2', { finishedAt: at(2026, 3, 15), total: 10, answered: 10, correct: 9, durationSec: 120 }),
      attempt('old', { finishedAt: at(2026, 3, 1) }),
    ]
    const words = [entry('w1', 'a', { addedAt: at(2026, 3, 10) }), entry('w2', 'b', { addedAt: at(2026, 1, 1) })]
    expect(summarize(history, words, r)).toEqual({
      attempts: 2,
      answered: 18,
      correct: 15,
      total: 20,
      skipped: 2,
      seconds: 420,
      newWords: 1,
      accuracy: 75,
    })
  })

  it('has no accuracy without attempts', () => {
    expect(summarize([], [], periodRange(7, [], [], NOW)).accuracy).toBeNull()
  })
})

describe('activitySeries', () => {
  it('has one point per day with a running dictionary size', () => {
    const r = periodRange(7, [], [], NOW)
    const history = [attempt('a', { finishedAt: at(2026, 3, 15), answered: 5, correct: 4, durationSec: 150 })]
    const words = [entry('w1', 'a', { addedAt: at(2026, 1, 1) }), entry('w2', 'b', { addedAt: at(2026, 3, 12) })]
    const { points, bucket } = activitySeries(history, words, r)
    expect(bucket).toBe('day')
    expect(points).toHaveLength(7)
    expect(points.map((p) => p.words)).toEqual([1, 1, 1, 2, 2, 2, 2])
    expect(points.at(-1)).toMatchObject({ start: at(2026, 3, 15, 0), answered: 5, correct: 4, minutes: 3 })
  })

  it('switches to weeks beyond 90 days', () => {
    const r = { from: at(2025, 1, 1, 0), to: at(2026, 1, 1, 0), days: 365 }
    const { points, bucket } = activitySeries([], [], r)
    expect(bucket).toBe('week')
    expect(points).toHaveLength(53)
  })
})

describe('streakDays', () => {
  const on = (...days: number[]) => days.map((d, i) => attempt(`a${i}`, { finishedAt: at(2026, 3, d) }))

  it('counts consecutive days back from today', () => {
    expect(streakDays(on(15, 14, 13, 11), NOW)).toBe(3)
  })

  it('still counts when today has nothing yet', () => {
    expect(streakDays(on(14, 13), NOW)).toBe(2)
  })

  it('is broken by a missed day before yesterday', () => {
    expect(streakDays(on(13, 12), NOW)).toBe(0)
    expect(streakDays([], NOW)).toBe(0)
  })

  it('startOfDay is local midnight', () => {
    expect(startOfDay(NOW)).toBe(at(2026, 3, 15, 0))
  })
})

describe('attemptSeries', () => {
  it('numbers attempts in time order with a rounded percent', () => {
    const r = periodRange(7, [], [], NOW)
    const history = [
      attempt('b', { finishedAt: at(2026, 3, 15), percent: 66.666 }),
      attempt('a', { finishedAt: at(2026, 3, 14), percent: 50, mode: 'exam', passed: false }),
    ]
    expect(attemptSeries(history, r)).toEqual([
      { id: 'a', index: 1, finishedAt: at(2026, 3, 14), percent: 50, mode: 'exam', passed: false },
      { id: 'b', index: 2, finishedAt: at(2026, 3, 15), percent: 66.7, mode: 'training', passed: true },
    ])
  })
})

describe('topicSeries', () => {
  it('ranks topics best first with their names', () => {
    const b = bank([question('q1'), question('q2', { topic: 'physiology' })])
    const r = periodRange(7, [], [], NOW)
    const history = [
      attempt('a', {
        finishedAt: at(2026, 3, 15),
        items: [
          { qid: 'q1', order: [], chosen: 1 },
          { qid: 'q2', order: [], chosen: 0 },
        ],
      }),
    ]
    const series = topicSeries(history, b, r)
    expect(series.map((t) => [t.topic, t.percent])).toEqual([
      ['physiology', 100],
      ['anatomy', 0],
    ])
    expect(series[0].name).toBe(b.topicName('physiology'))
  })
})
