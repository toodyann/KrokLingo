// End-to-end over the real Postgres wire protocol: PGlite behind a socket, the postgres.js driver used
// in production, migrations applied on start, and server.ts itself started as a process.

import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { UserState } from '@kroklingo/shared'

const SECRET = 'e2e-secret-at-least-32-characters-long!'
const SUPABASE = 'https://e2e.supabase.co'
const USER = '33333333-3333-4333-8333-333333333333'

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer()
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number }
      s.close(() => resolve(port))
    })
    s.on('error', reject)
  })
}

async function waitFor(url: string, timeoutMs = 20_000): Promise<Response> {
  const until = Date.now() + timeoutMs
  for (;;) {
    try {
      return await fetch(url)
    } catch (err) {
      if (Date.now() > until) throw err
      await new Promise((r) => setTimeout(r, 200))
    }
  }
}

let pg: PGlite
let socket: PGLiteSocketServer
let server: ChildProcess
let base: string
let output = ''

beforeAll(async () => {
  pg = new PGlite()
  const dbPort = await freePort()
  // PGlite is a single Postgres session: one connection keeps transactions isolated as on a real server
  socket = new PGLiteSocketServer({ db: pg, port: dbPort, host: '127.0.0.1', maxConnections: 1 })
  await socket.start()

  const apiPort = await freePort()
  base = `http://127.0.0.1:${apiPort}`
  server = spawn(process.execPath, [fileURLToPath(new URL('./server.ts', import.meta.url))], {
    env: {
      ...process.env,
      DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${dbPort}/postgres`,
      SUPABASE_URL: SUPABASE,
      SUPABASE_JWT_SECRET: SECRET,
      MIGRATE_ON_START: 'true',
      DB_POOL_MAX: '1',
      PORT: String(apiPort),
      HOST: '127.0.0.1',
      CORS_ORIGINS: 'https://toodyann.github.io',
      LOG: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout?.on('data', (d) => (output += d))
  server.stderr?.on('data', (d) => (output += d))
  await waitFor(`${base}/health`)
}, 40_000)

afterAll(async () => {
  server?.kill()
  await socket?.stop()
  await pg?.close()
})

async function token() {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER)
    .setAudience('authenticated')
    .setIssuer(`${SUPABASE}/auth/v1`)
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(SECRET))
}

describe('server.ts over the postgres.js driver', () => {
  it('starts, applies migrations and reaches the database', async () => {
    expect(output).toContain('migrations applied')
    expect(await (await fetch(`${base}/health`)).json()).toEqual({ ok: true })
    expect(await (await fetch(`${base}/ready`)).json()).toEqual({ ok: true, db: true })
    const tables = await pg.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public' order by 1")
    expect(tables.rows.map((r) => r.tablename)).toEqual(['active_sessions', 'attempts', 'custom_banks', 'dictionary_entries', 'user_settings'])
  })

  it('stores and reads user data end to end', async () => {
    const auth = { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }
    const entry = { id: 'w1', word: 'tooth', translation: 'зуб', note: '', source: 'builtin', addedAt: 1, updatedAt: 1, lookups: 1, learned: false, box: 0 }
    const put = await fetch(`${base}/api/dictionary/w1`, { method: 'PUT', headers: auth, body: JSON.stringify({ entry }) })
    expect(put.status).toBe(200)
    const replaced = await fetch(`${base}/api/state`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ state: { settings: { threshold: 55 }, dictionary: [entry], history: [], session: null, customBank: null } }),
    })
    expect(replaced.status).toBe(200)
    expect(((await replaced.json()) as UserState).settings).toEqual({ threshold: 55 })
    const state = (await (await fetch(`${base}/api/state`, { headers: auth })).json()) as UserState
    expect(state.settings).toEqual({ threshold: 55 })
    expect(state.dictionary.map((e) => e.word)).toEqual(['tooth'])
  })

  it('answers browsers from the allowed origin only', async () => {
    const res = await fetch(`${base}/api/state`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://toodyann.github.io', 'Access-Control-Request-Method': 'PUT' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('https://toodyann.github.io')
  })
})
