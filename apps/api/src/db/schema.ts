// User data tables. user_id is the Supabase Auth user id (the "sub" of the access token).
// Records are stored as JSON documents keyed by the same ids the web app uses, so the API never
// has to translate between shapes; a few columns are lifted out for lookups and ordering.

import { bigint, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { ActiveSession, AttemptRecord, CustomBank, DictEntry, Settings } from '@kroklingo/shared'

const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey(),
  data: jsonb('data').$type<Partial<Settings>>().notNull(),
  updatedAt: updatedAt(),
})

export const dictionaryEntries = pgTable(
  'dictionary_entries',
  {
    userId: uuid('user_id').notNull(),
    id: text('id').notNull(),
    word: text('word').notNull(),
    data: jsonb('data').$type<DictEntry>().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] }), index('dictionary_entries_user_word').on(t.userId, t.word)],
)

export const attempts = pgTable(
  'attempts',
  {
    userId: uuid('user_id').notNull(),
    id: text('id').notNull(),
    finishedAt: bigint('finished_at', { mode: 'number' }).notNull(),
    data: jsonb('data').$type<AttemptRecord>().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] }), index('attempts_user_finished').on(t.userId, t.finishedAt)],
)

export const activeSessions = pgTable('active_sessions', {
  userId: uuid('user_id').primaryKey(),
  data: jsonb('data').$type<ActiveSession>().notNull(),
  updatedAt: updatedAt(),
})

export const customBanks = pgTable('custom_banks', {
  userId: uuid('user_id').primaryKey(),
  data: jsonb('data').$type<CustomBank>().notNull(),
  updatedAt: updatedAt(),
})

// ----- question bank: shared by everyone, seeded from ./bank/*.json (see src/bank.ts) -----

export const bankMeta = pgTable('bank_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const bankCollections = pgTable('bank_collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  /** Language of the questions: 'en' or 'uk'. */
  lang: text('lang').notNull().default('en'),
  position: integer('position').notNull(),
})

export const bankPassages = pgTable('bank_passages', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').notNull(),
  title: text('title').notNull(),
  text: text('text').notNull(),
})

export const bankQuestions = pgTable(
  'bank_questions',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').notNull(),
    topic: text('topic').notNull(),
    text: text('text').notNull(),
    options: jsonb('options').$type<string[]>().notNull(),
    /** Index of the correct option in `options`. */
    correct: integer('correct').notNull(),
    explanation: text('explanation'),
    passageId: text('passage_id'),
    position: integer('position').notNull(),
  },
  (t) => [index('bank_questions_collection').on(t.collectionId, t.position)],
)
