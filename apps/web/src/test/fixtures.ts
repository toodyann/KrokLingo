// Small builders for tests: a question bank, attempts and dictionary entries with sensible defaults.
import { buildBank } from '../store/buildBank'
import type { Bank } from '../store/context'
import type { AttemptRecord, Collection, CustomBank, DictEntry, Lang, Passage, Question } from '../types'

export const EMPTY_CUSTOM: CustomBank = { collections: [], questions: [], passages: [] }

export function question(id: string, patch: Partial<Question> = {}): Question {
  return {
    id,
    topic: 'anatomy',
    collection: 'en-col',
    text: `Question ${id}?`,
    options: ['Right', 'Wrong 1', 'Wrong 2', 'Wrong 3', 'Wrong 4'],
    correct: 0,
    ...patch,
  }
}

export const EN_COLLECTION: Collection = { id: 'en-col', name: 'Krok 2020', lang: 'en' }
export const UK_COLLECTION: Collection = { id: 'uk-col', name: 'Крок 2020', lang: 'uk' }

/** A bank with English and Ukrainian collections; questions go to 'en-col' unless they say otherwise. */
export function bank(
  questions: Question[],
  {
    lang = 'en',
    passages = [] as Passage[],
    custom = EMPTY_CUSTOM,
  }: { lang?: Lang; passages?: Passage[]; custom?: CustomBank } = {},
): Bank {
  return buildBank({ collections: [EN_COLLECTION, UK_COLLECTION], questions, passages }, custom, lang)
}

export function attempt(id: string, patch: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id,
    mode: 'training',
    title: 'Тренування',
    startedAt: 0,
    finishedAt: 0,
    durationSec: 60,
    timeLimitSec: null,
    timedOut: false,
    total: 10,
    answered: 10,
    correct: 7,
    percent: 70,
    threshold: 60,
    passed: true,
    topics: [],
    items: [],
    newWords: [],
    ...patch,
  }
}

export function entry(id: string, word: string, patch: Partial<DictEntry> = {}): DictEntry {
  return {
    id,
    word,
    translation: '',
    note: '',
    source: 'builtin',
    addedAt: 0,
    updatedAt: 0,
    lookups: 1,
    learned: false,
    box: 0,
    ...patch,
  }
}

/** Local-time timestamp, so day bucketing does not depend on the machine's time zone. */
export const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
