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

/** Language of a collection's questions. */
export type Lang = 'en' | 'uk'

export interface Collection {
  id: string
  name: string
  description?: string
  /** 'en' when absent. */
  lang?: Lang
  custom?: boolean
}

/** Stored origin of a dictionary translation. 'manual' marks the user's own text, which is never replaced. */
export type TranslationSource = 'builtin' | 'online' | 'manual' | 'none'

/** Where a translation shown for a click came from, highest priority first. */
export type ResolutionSource =
  | 'user-context'
  | 'user'
  | 'question'
  | 'phrase'
  | 'latin'
  | 'abbr'
  | 'context'
  | 'dictionary'
  | 'online'
  | 'none'

/** verified: confirmed data; likely: chosen from context or a single-sense entry; uncertain: a best guess. */
export type Certainty = 'verified' | 'likely' | 'uncertain' | 'unknown'

export type LexicalUnit = 'word' | 'phrase' | 'latin' | 'abbr'

export interface DictEntry {
  id: string
  /** Dictionary key: base form of a word, or a whole phrase ("mental nerve"). */
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
  /** Form as first clicked ("teeth", "Mental"). */
  surface?: string
  /** Sentence it was first clicked in. */
  context?: string
  /** Question (or passage) id of that sentence. */
  contextId?: string
  kind?: LexicalUnit
  origin?: ResolutionSource
  certainty?: Certainty
  /** The user's own translations for particular questions: context id → translation. */
  contextual?: Record<string, string>
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
  /** Language of the questions used for tests, the exam and training. */
  questionLang: Lang
}

export interface CustomBank {
  collections: Collection[]
  questions: Question[]
  passages: Passage[]
}
