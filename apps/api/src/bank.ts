// The shared question bank. Its source of truth is ./bank/*.json in this package (one file per
// collection); on start the API copies them into the bank_* tables when their content changed, and
// GET /api/bank serves the tables as one cached, pre-compressed JSON document.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { asc, eq } from 'drizzle-orm'
import type { BankPayload, BankRow, Collection, Lang, Passage } from '@kroklingo/shared'
import type { Db } from './db/client.ts'
import { bankCollections, bankMeta, bankPassages, bankQuestions } from './db/schema.ts'

export const BANK_DIR = fileURLToPath(new URL('../bank', import.meta.url))

/** Compact row as written by the booklet scripts: the correct option comes first. */
type FileRow = [id: string, topic: string, text: string, options: string[], passageId?: string]

interface FileQuestion {
  id: string
  topic: string
  text: string
  options: string[]
  correct: number
  explanation?: string
  passageId?: string
}

export interface BankFile {
  collection: Collection
  passages: Passage[]
  questions: (FileRow | FileQuestion)[]
}

export interface BankQuestion extends FileQuestion {
  collection: string
}

export interface BankSource {
  version: string
  collections: (Collection & { lang: Lang })[]
  passages: (Passage & { collection: string })[]
  questions: BankQuestion[]
}

/**
 * Display order: the hand-written sets, the official English booklets by year, the professional
 * English exams, then the Ukrainian booklets.
 */
function rank(id: string): number {
  if (id === 'basic') return 0
  if (id === 'english') return 1
  if (id.startsWith('krok-')) return 2
  if (id.startsWith('english-')) return 3
  return 4
}

/** Reads every collection file; the version is a hash of their contents. */
export function readBankFiles(dir = BANK_DIR): BankSource {
  const names = readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .sort()
  const hash = createHash('sha256')
  const files = names.map((n) => {
    const raw = readFileSync(join(dir, n), 'utf8')
    hash.update(n).update('\0').update(raw).update('\0')
    return JSON.parse(raw) as BankFile
  })
  files.sort((a, b) => rank(a.collection.id) - rank(b.collection.id) || a.collection.id.localeCompare(b.collection.id))

  const collections = files.map((f) => ({ ...f.collection, lang: f.collection.lang ?? ('en' as const) }))
  const passages = files.flatMap((f) => f.passages.map((p) => ({ ...p, collection: f.collection.id })))
  const questions = files.flatMap((f) =>
    f.questions.map((q): BankQuestion => {
      if (Array.isArray(q)) {
        const [id, topic, text, options, passageId] = q
        return { id, topic, text, options, correct: 0, passageId, collection: f.collection.id }
      }
      return { ...q, collection: f.collection.id }
    }),
  )
  return { version: hash.digest('hex').slice(0, 16), collections, passages, questions }
}

const VERSION_KEY = 'version'

async function storedVersion(db: Db): Promise<string | null> {
  const rows = await db.select({ value: bankMeta.value }).from(bankMeta).where(eq(bankMeta.key, VERSION_KEY))
  return rows[0]?.value ?? null
}

/** Replaces the bank tables with `source` unless they already hold this version. */
export async function seedBank(db: Db, source: BankSource): Promise<boolean> {
  if ((await storedVersion(db)) === source.version) return false
  const ids = new Set<string>()
  for (const q of source.questions) {
    if (ids.has(q.id)) throw new Error(`duplicate question id ${q.id}`)
    ids.add(q.id)
  }
  await db.transaction(async (tx) => {
    await tx.delete(bankQuestions)
    await tx.delete(bankPassages)
    await tx.delete(bankCollections)
    if (source.collections.length) {
      await tx.insert(bankCollections).values(
        source.collections.map((c, i) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? null,
          lang: c.lang,
          position: i,
        })),
      )
    }
    for (let i = 0; i < source.passages.length; i += 500) {
      await tx.insert(bankPassages).values(
        source.passages.slice(i, i + 500).map((p) => ({ id: p.id, collectionId: p.collection, title: p.title, text: p.text })),
      )
    }
    for (let i = 0; i < source.questions.length; i += 500) {
      await tx.insert(bankQuestions).values(
        source.questions.slice(i, i + 500).map((q, j) => ({
          id: q.id,
          collectionId: q.collection,
          topic: q.topic,
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation ?? null,
          passageId: q.passageId ?? null,
          position: i + j,
        })),
      )
    }
    await tx
      .insert(bankMeta)
      .values({ key: VERSION_KEY, value: source.version })
      .onConflictDoUpdate({ target: bankMeta.key, set: { value: source.version } })
  })
  return true
}

export interface BankDocument {
  version: string
  json: Buffer
  gzip: Buffer
  brotli: Buffer
}

/** Reads the bank tables into the payload served by GET /api/bank. */
export async function loadBankPayload(db: Db): Promise<BankPayload> {
  const [version, collections, passages, questions] = await Promise.all([
    storedVersion(db),
    db.select().from(bankCollections).orderBy(asc(bankCollections.position)),
    db.select().from(bankPassages),
    db.select().from(bankQuestions).orderBy(asc(bankQuestions.position)),
  ])
  return {
    version: version ?? 'empty',
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
      lang: c.lang as Lang,
    })),
    passages: passages.map((p) => ({ id: p.id, title: p.title, text: p.text })),
    questions: questions.map((q): BankRow => {
      const row: BankRow = [q.id, q.collectionId, q.topic, q.text, q.options, q.correct]
      if (q.passageId || q.explanation) row.push(q.passageId ?? null)
      if (q.explanation) row.push(q.explanation)
      return row
    }),
  }
}

/** Keeps one serialized, compressed copy of the bank per version. */
export function bankCache(db: Db) {
  let current: BankDocument | null = null
  let building: Promise<BankDocument> | null = null
  return async function get(): Promise<BankDocument> {
    const version = (await storedVersion(db)) ?? 'empty'
    if (current?.version === version) return current
    building ??= (async () => {
      const payload = await loadBankPayload(db)
      const json = Buffer.from(JSON.stringify(payload))
      return {
        version: payload.version,
        json,
        gzip: gzipSync(json, { level: 9 }),
        brotli: brotliCompressSync(json, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }),
      }
    })().finally(() => {
      building = null
    })
    current = await building
    return current
  }
}
