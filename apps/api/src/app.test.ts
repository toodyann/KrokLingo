import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { FastifyInstance } from 'fastify'
import { SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AttemptRecord, DictEntry, UserState } from '@kroklingo/shared'
import { buildApp } from './app.ts'
import { supabaseVerifier } from './auth.ts'
import type { Db } from './db/client.ts'
import * as schema from './db/schema.ts'

const SUPABASE = 'https://test-project.supabase.co'
const SECRET = 'test-secret-at-least-32-characters-long'
const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'

async function token(sub: string, opts: { secret?: string; aud?: string; exp?: string } = {}) {
  return new SignJWT({ email: `${sub.slice(0, 4)}@example.com`, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuer(`${SUPABASE}/auth/v1`)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(new TextEncoder().encode(opts.secret ?? SECRET))
}

const entry = (id: string, word: string, updatedAt = 1): DictEntry => ({
  id,
  word,
  translation: 'переклад',
  note: '',
  source: 'builtin',
  addedAt: updatedAt,
  updatedAt,
  lookups: 1,
  learned: false,
  box: 0,
})

const attempt = (id: string, finishedAt: number) =>
  ({
    id,
    mode: 'training',
    title: 'Тренування',
    startedAt: finishedAt - 1000,
    finishedAt,
    items: [],
  }) as unknown as AttemptRecord

let pg: PGlite
let app: FastifyInstance
let alice: string
let bob: string

beforeAll(async () => {
  pg = new PGlite()
  const db = drizzle(pg, { schema })
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
  app = await buildApp({
    db: db as unknown as Db,
    verify: supabaseVerifier({ supabaseUrl: SUPABASE, jwtSecret: SECRET }),
    corsOrigins: ['https://toodyann.github.io'],
  })
  alice = await token(ALICE)
  bob = await token(BOB)
})

afterAll(async () => {
  await app.close()
  await pg.close()
})

const call = (method: 'GET' | 'PUT' | 'DELETE', url: string, auth?: string, payload?: unknown) =>
  app.inject({ method, url, headers: auth ? { authorization: `Bearer ${auth}` } : {}, ...(payload ? { payload } : {}) })

describe('auth', () => {
  it('health is public', async () => {
    expect((await call('GET', '/health')).json()).toEqual({ ok: true })
  })

  it('rejects requests without a token, with a wrong signature, audience or an expired token', async () => {
    expect((await call('GET', '/api/state')).statusCode).toBe(401)
    expect(
      (await call('GET', '/api/state', await token(ALICE, { secret: 'another-secret-another-secret-123' }))).statusCode,
    ).toBe(401)
    expect((await call('GET', '/api/state', await token(ALICE, { aud: 'anon' }))).statusCode).toBe(401)
    expect((await call('GET', '/api/state', await token(ALICE, { exp: '-1m' }))).statusCode).toBe(401)
  })

  it('answers CORS preflight only for allowed origins', async () => {
    const ok = await app.inject({
      method: 'OPTIONS',
      url: '/api/state',
      headers: { origin: 'https://toodyann.github.io', 'access-control-request-method': 'PUT' },
    })
    expect(ok.headers['access-control-allow-origin']).toBe('https://toodyann.github.io')
    const bad = await app.inject({
      method: 'OPTIONS',
      url: '/api/state',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'PUT' },
    })
    expect(bad.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('user data', () => {
  it('starts empty', async () => {
    const res = await call('GET', '/api/state', alice)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ settings: null, dictionary: [], history: [], session: null, customBank: null })
  })

  it('stores settings, dictionary, history, the unfinished test and the custom bank', async () => {
    expect((await call('PUT', '/api/settings', alice, { settings: { threshold: 60 } })).statusCode).toBe(200)
    expect((await call('PUT', '/api/dictionary/w1', alice, { entry: entry('w1', 'tooth') })).statusCode).toBe(200)
    expect((await call('PUT', '/api/dictionary/w2', alice, { entry: entry('w2', 'pulp', 2) })).statusCode).toBe(200)
    expect((await call('PUT', '/api/history/a1', alice, { record: attempt('a1', 5000) })).statusCode).toBe(200)
    expect((await call('PUT', '/api/session', alice, { session: { id: 's1', questions: [] } })).statusCode).toBe(200)
    expect(
      (await call('PUT', '/api/custom-bank', alice, { customBank: { collections: [], questions: [], passages: [] } }))
        .statusCode,
    ).toBe(200)

    const s = (await call('GET', '/api/state', alice)).json() as UserState
    expect(s.settings).toEqual({ threshold: 60 })
    expect(s.dictionary.map((e) => e.word)).toEqual(['pulp', 'tooth']) // newest first
    expect(s.history.map((r) => r.id)).toEqual(['a1'])
    expect(s.session?.id).toBe('s1')
    expect(s.customBank).toEqual({ collections: [], questions: [], passages: [] })
  })

  it('updates in place and deletes', async () => {
    await call('PUT', '/api/dictionary/w1', alice, { entry: { ...entry('w1', 'tooth', 3), translation: 'зуб' } })
    await call('PUT', '/api/settings', alice, { settings: { threshold: 70 } })
    await call('DELETE', '/api/dictionary/w2', alice)
    await call('DELETE', '/api/history/a1', alice)
    await call('PUT', '/api/session', alice, { session: null })
    const s = (await call('GET', '/api/state', alice)).json() as UserState
    expect(s.dictionary).toHaveLength(1)
    expect(s.dictionary[0].translation).toBe('зуб')
    expect(s.settings).toEqual({ threshold: 70 })
    expect(s.history).toEqual([])
    expect(s.session).toBeNull()
  })

  it('keeps users apart', async () => {
    await call('PUT', '/api/dictionary/w9', bob, { entry: entry('w9', 'enamel') })
    const a = (await call('GET', '/api/state', alice)).json() as UserState
    const b = (await call('GET', '/api/state', bob)).json() as UserState
    expect(a.dictionary.map((e) => e.word)).not.toContain('enamel')
    expect(b.dictionary.map((e) => e.word)).toEqual(['enamel'])
    // Bob cannot delete Alice's entry by id
    await call('DELETE', '/api/dictionary/w1', bob)
    expect(((await call('GET', '/api/state', alice)).json() as UserState).dictionary).toHaveLength(1)
  })

  it('replaces the whole state in one transaction', async () => {
    const state: UserState = {
      settings: { examQuestions: 30 },
      dictionary: [entry('x1', 'gum'), entry('x2', 'crown', 2)],
      history: [attempt('h2', 2000), attempt('h1', 1000)],
      session: null,
      customBank: null,
    }
    const res = await call('PUT', '/api/state', alice, { state })
    expect(res.statusCode).toBe(200)
    const s = res.json() as UserState
    expect(s.dictionary.map((e) => e.word)).toEqual(['crown', 'gum'])
    expect(s.history.map((r) => r.id)).toEqual(['h1', 'h2']) // oldest first
    expect(s.settings).toEqual({ examQuestions: 30 })
  })

  it('rejects malformed bodies', async () => {
    expect((await call('PUT', '/api/dictionary/w1', alice, { entry: { word: 'no id' } })).statusCode).toBe(400)
    expect((await call('PUT', '/api/dictionary/w1', alice, { entry: entry('other', 'tooth') })).statusCode).toBe(400)
    expect((await call('PUT', '/api/history/h1', alice, { record: { id: 'h1' } })).statusCode).toBe(400)
    expect((await call('PUT', '/api/state', alice, { state: { dictionary: 'nope' } })).statusCode).toBe(400)
  })
})

describe('database', () => {
  it('has row level security enabled on every user table', async () => {
    const res = await pg.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relname in ('user_settings','dictionary_entries','attempts','active_sessions','custom_banks')",
    )
    expect(res.rows).toHaveLength(5)
    expect(res.rows.every((r) => r.relrowsecurity)).toBe(true)
  })
})
