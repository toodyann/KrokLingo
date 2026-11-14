export type Mode = 'exam' | 'training'

export interface Question {
  id: string
  topic: string
  collection: string
  text: string
  options: string[]
  /** Index of the correct option in `options`. */
  correct: number
  explanation?: string
  passageId?: string
}

export interface Passage {
  id: string
  title: string
  text: string
}

export interface Topic {
  id: string
  name: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  custom?: boolean
}

export type TranslationSource = 'builtin' | 'online' | 'manual' | 'none'

export interface DictEntry {
  id: string
  word: string
  translation: string
  note: string
  source: TranslationSource
  addedAt: number
  updatedAt: number
  /** Test session during which the word was first added. */
  sessionId?: string
  lookups: number
  learned: boolean
  /** Flashcard box (0 = new / forgotten). */
  box: number
}

export interface SessionQuestion {
  qid: string
  /** Display order: order[displayIndex] = original option index. */
  order: number[]
}

export interface ActiveSession {
  id: string
  mode: Mode
  title: string
  startedAt: number
  /** Epoch ms when time runs out; null = no limit. */
  deadline: number | null
  questions: SessionQuestion[]
  /** Chosen original option index per question. */
  answers: (number | null)[]
  current: number
  instantFeedback: boolean
  threshold: number
  topics: string[]
}

export interface AttemptItem {
  qid: string
  order: number[]
  chosen: number | null
}

export interface AttemptRecord {
  id: string
  mode: Mode
  title: string
  startedAt: number
  finishedAt: number
  durationSec: number
  timeLimitSec: number | null
  timedOut: boolean
  total: number
  answered: number
  correct: number
  percent: number
  threshold: number
  passed: boolean
  topics: string[]
  items: AttemptItem[]
  newWords: { word: string; translation: string }[]
}

export interface Settings {
  threshold: number
  examQuestions: number
  examMinutes: number
  onlineTranslate: boolean
}

export interface CustomBank {
  collections: Collection[]
  questions: Question[]
  passages: Passage[]
}
