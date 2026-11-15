import type { Bank } from '../store/context'
import type { ActiveSession, AttemptRecord, DictEntry, Mode, Question } from '../types'
import { range, shuffle, uid } from './util'

interface CreateOptions {
  mode: Mode
  title: string
  questions: Question[]
  timeLimitMin: number | null
  instantFeedback: boolean
  threshold: number
  topics: string[]
}

export function createSession(opts: CreateOptions): ActiveSession {
  const now = Date.now()
  return {
    id: uid('s'),
    mode: opts.mode,
    title: opts.title,
    startedAt: now,
    deadline: opts.timeLimitMin ? now + opts.timeLimitMin * 60_000 : null,
    questions: opts.questions.map((q) => ({ qid: q.id, order: shuffle(range(q.options.length)) })),
    answers: opts.questions.map(() => null),
    current: 0,
    instantFeedback: opts.instantFeedback,
    threshold: opts.threshold,
    topics: opts.topics,
  }
}

export interface LiveStats {
  total: number
  answered: number
  correct: number
  wrong: number
  /** Correct answers as a share of answered questions. */
  percent: number
}

export function liveStats(session: ActiveSession, bank: Bank): LiveStats {
  let answered = 0
  let correct = 0
  session.questions.forEach((sq, i) => {
    const chosen = session.answers[i]
    if (chosen == null) return
    answered++
    if (bank.questionById.get(sq.qid)?.correct === chosen) correct++
  })
  return {
    total: session.questions.length,
    answered,
    correct,
    wrong: answered - correct,
    percent: answered ? (correct / answered) * 100 : 0,
  }
}

export function finalizeSession(
  session: ActiveSession,
  bank: Bank,
  dictionary: DictEntry[],
  timedOut: boolean,
): AttemptRecord {
  const finishedAt = session.deadline && timedOut ? Math.min(Date.now(), session.deadline) : Date.now()
  const stats = liveStats(session, bank)
  const percent = stats.total ? (stats.correct / stats.total) * 100 : 0
  const newWords = dictionary
    .filter((e) => e.sessionId === session.id)
    .sort((a, b) => a.addedAt - b.addedAt)
    .map((e) => ({ word: e.word, translation: e.translation }))

  return {
    id: session.id,
    mode: session.mode,
    title: session.title,
    startedAt: session.startedAt,
    finishedAt,
    durationSec: Math.round((finishedAt - session.startedAt) / 1000),
    timeLimitSec: session.deadline ? Math.round((session.deadline - session.startedAt) / 1000) : null,
    timedOut,
    total: stats.total,
    answered: stats.answered,
    correct: stats.correct,
    percent,
    threshold: session.threshold,
    passed: percent >= session.threshold,
    topics: session.topics,
    items: session.questions.map((sq, i) => ({ qid: sq.qid, order: sq.order, chosen: session.answers[i] })),
    newWords,
  }
}

/** Question ids whose most recent answer was wrong or skipped. */
export function mistakeIds(history: AttemptRecord[], bank: Bank): Set<string> {
  const last = new Map<string, boolean>()
  for (const record of [...history].sort((a, b) => a.finishedAt - b.finishedAt)) {
    for (const item of record.items) {
      const q = bank.questionById.get(item.qid)
      // mistakes are practised in the current question language
      if (!q || bank.langOf(q) !== bank.lang) continue
      last.set(item.qid, item.chosen === q.correct)
    }
  }
  return new Set([...last].filter(([, ok]) => !ok).map(([id]) => id))
}

export interface TopicStat {
  topic: string
  correct: number
  total: number
}

export function topicStats(records: AttemptRecord[], bank: Bank): TopicStat[] {
  const map = new Map<string, TopicStat>()
  for (const record of records) {
    for (const item of record.items) {
      const q = bank.questionById.get(item.qid)
      if (!q) continue
      const stat = map.get(q.topic) ?? { topic: q.topic, correct: 0, total: 0 }
      stat.total++
      if (item.chosen === q.correct) stat.correct++
      map.set(q.topic, stat)
    }
  }
  const order = new Map(bank.topics.map((t, i) => [t.id, i]))
  return [...map.values()].sort((a, b) => (order.get(a.topic) ?? 99) - (order.get(b.topic) ?? 99))
}
