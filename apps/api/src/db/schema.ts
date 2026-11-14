// User data tables. user_id is the Supabase Auth user id (the "sub" of the access token).
// Records are stored as JSON documents keyed by the same ids the web app uses, so the API never
// has to translate between shapes; a few columns are lifted out for lookups and ordering.

import { bigint, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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
