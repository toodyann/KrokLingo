import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { BankPayload } from '@kroklingo/shared'
import { buildApp } from './app.ts'
import { readBankFiles, seedBank, type BankFile } from './bank.ts'
import type { Db } from './db/client.ts'
import * as schema from './db/schema.ts'

const files: Record<string, BankFile> = {
  'krok-2010.json': {
    collection: { id: 'krok-2010', name: 'Буклет 2010' },
    passages: [],
    questions: [['k10-1', 'anatomy', 'Which nerve?', ['Lingual', 'Vagus', 'Facial', 'Optic', 'Hypoglossal']]],
  },
  'basic.json': {
    collection: { id: 'basic', name: 'Базові', lang: 'en' },
    passages: [{ id: 'p1', title: 'Reading', text: 'Teeth are…' }],
    questions: [
      { id: 'b-1', topic: 'physiology', text: 'What?', options: ['A', 'B'], correct: 1, explanation: 'Because' },
      { id: 'b-2', topic: 'reading', text: 'Why?', options: ['C', 'D'], correct: 0, passageId: 'p1' },
    ],
  },
  'uk-2022.json': {
    collection: { id: 'uk-2022', name: 'Буклет 2022 (укр.)', lang: 'uk' },
    passages: [],
    questions: [['u22-1', 'anatomy', 'Який нерв?', ['Язиковий', 'Блукаючий']]],
  },
}

let dir: string
let pg: PGlite
let db: Db
let app: FastifyInstance

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bank-'))
  mkdirSync(dir, { recursive: true })
  for (const [name, f] of Object.entries(files)) writeFileSync(join(dir, name), JSON.stringify(f))
  pg = new PGlite()
  db = drizzle(pg, { schema }) as unknown as Db
  await migrate(db as never, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
  app = await buildApp({ db, verify: async () => ({ id: 'x' }), corsOrigins: ['https://toodyann.github.io'] })
})

afterAll(async () => {
  await app.close()
  await pg.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('question bank', () => {
  it('reads files in display order with defaults', () => {
    const src = readBankFiles(dir)
    expect(src.collections.map((c) => [c.id, c.lang])).toEqual([
      ['basic', 'en'],
      ['krok-2010', 'en'],
      ['uk-2022', 'uk'],
    ])
    expect(src.questions.find((q) => q.id === 'k10-1')).toMatchObject({ correct: 0, collection: 'krok-2010' })
    expect(src.version).toMatch(/^[0-9a-f]{16}$/)
  })

  it('serves an empty bank before seeding', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/bank' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ version: 'empty', questions: [] })
  })

  it('seeds once per version and serves it publicly with ETag', async () => {
    const src = readBankFiles(dir)
    expect(await seedBank(db, src)).toBe(true)
    expect(await seedBank(db, src)).toBe(false)

    const res = await app.inject({ method: 'GET', url: '/api/bank' })
    expect(res.statusCode).toBe(200)
    expect(res.headers.etag).toBe(`"${src.version}"`)
    const body = res.json<BankPayload>()
    expect(body.version).toBe(src.version)
    expect(body.collections.map((c) => c.id)).toEqual(['basic', 'krok-2010', 'uk-2022'])
    expect(body.passages).toEqual([{ id: 'p1', title: 'Reading', text: 'Teeth are…' }])
    expect(body.questions).toEqual([
      ['b-1', 'basic', 'physiology', 'What?', ['A', 'B'], 1, null, 'Because'],
      ['b-2', 'basic', 'reading', 'Why?', ['C', 'D'], 0, 'p1'],
      ['k10-1', 'krok-2010', 'anatomy', 'Which nerve?', ['Lingual', 'Vagus', 'Facial', 'Optic', 'Hypoglossal'], 0],
      ['u22-1', 'uk-2022', 'anatomy', 'Який нерв?', ['Язиковий', 'Блукаючий'], 0],
    ])

    const again = await app.inject({ method: 'GET', url: '/api/bank', headers: { 'if-none-match': `"${src.version}"` } })
    expect(again.statusCode).toBe(304)

    const gz = await app.inject({ method: 'GET', url: '/api/bank', headers: { 'accept-encoding': 'gzip' } })
    expect(gz.headers['content-encoding']).toBe('gzip')
    expect(JSON.parse(gunzipSync(gz.rawPayload).toString()).version).toBe(src.version)
  })

  it('replaces the tables when the files change', async () => {
    writeFileSync(join(dir, 'uk-2022.json'), JSON.stringify({ ...files['uk-2022.json'], questions: [] }))
    const src = readBankFiles(dir)
    expect(await seedBank(db, src)).toBe(true)
    const body = (await app.inject({ method: 'GET', url: '/api/bank' })).json<BankPayload>()
    expect(body.version).toBe(src.version)
    expect(body.questions.map((q) => q[0])).toEqual(['b-1', 'b-2', 'k10-1'])
  })

  it('rejects duplicate ids', async () => {
    const src = readBankFiles(dir)
    src.version = 'dup'
    src.questions.push({ ...src.questions[0] })
    await expect(seedBank(db, src)).rejects.toThrow(/duplicate question id/)
  })

  it('seeds the real bank files', async () => {
    const real = readBankFiles()
    expect(real.questions.length).toBeGreaterThan(2000)
    const fresh = new PGlite()
    const freshDb = drizzle(fresh, { schema }) as unknown as Db
    await migrate(freshDb as never, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
    expect(await seedBank(freshDb, real)).toBe(true)
    await fresh.close()
  })
})
