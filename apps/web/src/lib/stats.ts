import type { Bank } from '../store/context'
import type { AttemptRecord, DictEntry } from '../types'
import { topicStats, type TopicStat } from './session'

export type Period = 7 | 30 | 90 | 'all'

const DAY = 86_400_000

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export interface Range {
  from: number
  /** Exclusive end. */
  to: number
  days: number
}

export function periodRange(
  period: Period,
  history: AttemptRecord[],
  dictionary: DictEntry[],
  now = Date.now(),
): Range {
  const to = addDays(startOfDay(now), 1)
  if (period !== 'all') return { from: addDays(to, -period), to, days: period }
  const firsts = [...history.map((r) => r.finishedAt), ...dictionary.map((e) => e.addedAt)]
  const earliest = firsts.length ? startOfDay(Math.min(...firsts)) : addDays(to, -30)
  const days = Math.max(7, Math.round((to - earliest) / DAY))
  return { from: addDays(to, -days), to, days }
}

export function previousRange(range: Range): Range {
  return { from: addDays(range.from, -range.days), to: range.from, days: range.days }
}

const inRange = (ts: number, r: Range) => ts >= r.from && ts < r.to

export interface Summary {
  attempts: number
  answered: number
  correct: number
  total: number
  skipped: number
  seconds: number
  newWords: number
  /** Correct among all questions shown (skipped count as wrong, as in the exam). */
  accuracy: number | null
}

export function summarize(history: AttemptRecord[], dictionary: DictEntry[], range: Range): Summary {
  const records = history.filter((r) => inRange(r.finishedAt, range))
  const total = records.reduce((s, r) => s + r.total, 0)
  const answered = records.reduce((s, r) => s + r.answered, 0)
  const correct = records.reduce((s, r) => s + r.correct, 0)
  return {
    attempts: records.length,
    answered,
    correct,
    total,
    skipped: total - answered,
    seconds: records.reduce((s, r) => s + r.durationSec, 0),
    newWords: dictionary.filter((e) => inRange(e.addedAt, range)).length,
    accuracy: total ? (correct / total) * 100 : null,
  }
}

export interface ActivityPoint {
  /** Bucket start (local midnight). */
  start: number
  answered: number
  correct: number
  minutes: number
  /** Dictionary size at the end of the bucket. */
  words: number
}

/** Daily buckets up to 90 days; weekly beyond that, so columns stay readable. */
export function activitySeries(
  history: AttemptRecord[],
  dictionary: DictEntry[],
  range: Range,
): {
  points: ActivityPoint[]
  bucket: 'day' | 'week'
} {
  const bucket = range.days > 90 ? 'week' : 'day'
  const step = bucket === 'week' ? 7 : 1
  const points: ActivityPoint[] = []
  for (let start = range.from; start < range.to; start = addDays(start, step)) {
    const end = Math.min(addDays(start, step), range.to)
    const records = history.filter((r) => r.finishedAt >= start && r.finishedAt < end)
    points.push({
      start,
      answered: records.reduce((s, r) => s + r.answered, 0),
      correct: records.reduce((s, r) => s + r.correct, 0),
      minutes: Math.round(records.reduce((s, r) => s + r.durationSec, 0) / 60),
      words: dictionary.filter((e) => e.addedAt < end).length,
    })
  }
  return { points, bucket }
}

/** Consecutive days, ending today (or yesterday if today has no activity yet), with a finished test. */
export function streakDays(history: AttemptRecord[], now = Date.now()): number {
  const days = new Set(history.map((r) => startOfDay(r.finishedAt)))
  let day = startOfDay(now)
  if (!days.has(day)) day = addDays(day, -1)
  let streak = 0
  while (days.has(day)) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export interface AttemptPoint {
  id: string
  index: number
  finishedAt: number
  percent: number
  mode: AttemptRecord['mode']
  passed: boolean
}

export function attemptSeries(history: AttemptRecord[], range: Range): AttemptPoint[] {
  return history
    .filter((r) => inRange(r.finishedAt, range))
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .map((r, i) => ({
      id: r.id,
      index: i + 1,
      finishedAt: r.finishedAt,
      percent: Math.round(r.percent * 10) / 10,
      mode: r.mode,
      passed: r.passed,
    }))
}

export interface TopicPoint extends TopicStat {
  name: string
  percent: number
}

/** Accuracy per topic, ranked best first. */
export function topicSeries(history: AttemptRecord[], bank: Bank, range: Range): TopicPoint[] {
  return topicStats(
    history.filter((r) => inRange(r.finishedAt, range)),
    bank,
  )
    .map((t) => ({ ...t, name: bank.topicName(t.topic), percent: Math.round((t.correct / t.total) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
}
