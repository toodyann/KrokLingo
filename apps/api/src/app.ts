import cors from '@fastify/cors'
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { UserState } from '@kroklingo/shared'
import type { AuthUser, Verify } from './auth.ts'
import { bankCache } from './bank.ts'
import type { Db } from './db/client.ts'
import { activeSessions, attempts, customBanks, dictionaryEntries, userSettings } from './db/schema.ts'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

export interface AppOptions {
  db: Db
  verify: Verify
  /** Origins allowed to call the API from a browser (the GitHub Pages site, localhost). */
  corsOrigins: string[]
  logger?: boolean
}

// Bodies are validated for the fields the API relies on; the rest of each record is the web app's own
// shape and is stored as is.
const Entry = z.looseObject({
  id: z.string().min(1).max(100),
  word: z.string().min(1).max(300),
  updatedAt: z.number().optional(),
})
const Attempt = z.looseObject({ id: z.string().min(1).max(100), finishedAt: z.number() })
const Settings = z.looseObject({})
const Session = z.looseObject({ id: z.string().min(1).max(100) })
const Bank = z.looseObject({
  collections: z.array(z.unknown()),
  questions: z.array(z.unknown()),
  passages: z.array(z.unknown()),
})
const State = z.object({
  settings: Settings.nullable(),
  dictionary: z.array(Entry).max(50_000),
  history: z.array(Attempt).max(20_000),
  session: Session.nullable(),
  customBank: Bank.nullable(),
})

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

async function readState(db: Db, userId: string): Promise<UserState> {
  const [settings, dictionary, history, session, bank] = await Promise.all([
    db.select({ data: userSettings.data }).from(userSettings).where(eq(userSettings.userId, userId)),
    db.select({ data: dictionaryEntries.data }).from(dictionaryEntries).where(eq(dictionaryEntries.userId, userId)),
    db
      .select({ data: attempts.data })
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .orderBy(asc(attempts.finishedAt)),
    db.select({ data: activeSessions.data }).from(activeSessions).where(eq(activeSessions.userId, userId)),
    db.select({ data: customBanks.data }).from(customBanks).where(eq(customBanks.userId, userId)),
  ])
  return {
    settings: settings[0]?.data ?? null,
    dictionary: dictionary.map((r) => r.data).sort((a, b) => b.addedAt - a.addedAt),
    history: history.map((r) => r.data),
    session: session[0]?.data ?? null,
    customBank: bank[0]?.data ?? null,
  }
}

async function writeState(tx: Tx | Db, userId: string, s: UserState) {
  await tx.delete(userSettings).where(eq(userSettings.userId, userId))
  await tx.delete(dictionaryEntries).where(eq(dictionaryEntries.userId, userId))
  await tx.delete(attempts).where(eq(attempts.userId, userId))
  await tx.delete(activeSessions).where(eq(activeSessions.userId, userId))
  await tx.delete(customBanks).where(eq(customBanks.userId, userId))
  if (s.settings) await tx.insert(userSettings).values({ userId, data: s.settings })
  for (let i = 0; i < s.dictionary.length; i += 500) {
    const chunk = s.dictionary.slice(i, i + 500)
    await tx.insert(dictionaryEntries).values(chunk.map((e) => ({ userId, id: e.id, word: e.word, data: e })))
  }
  for (let i = 0; i < s.history.length; i += 200) {
    const chunk = s.history.slice(i, i + 200)
    await tx.insert(attempts).values(chunk.map((r) => ({ userId, id: r.id, finishedAt: r.finishedAt, data: r })))
  }
  if (s.session) await tx.insert(activeSessions).values({ userId, data: s.session })
  if (s.customBank) await tx.insert(customBanks).values({ userId, data: s.customBank })
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 8 * 1024 * 1024 })
  const { db, verify } = opts

  await app.register(cors, {
    origin: opts.corsOrigins,
    methods: ['GET', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['ETag'],
    maxAge: 600,
  })

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError)
      return reply.code(400).send({ error: 'invalid body', issues: err.issues.slice(0, 5) })
    const status = (err as { statusCode?: number }).statusCode ?? 500
    if (status >= 500) app.log.error(err)
    return reply.code(status).send({ error: status >= 500 ? 'internal error' : (err as Error).message })
  })

  // liveness (no database) for the host's health check; readiness also reaches the database
  app.get('/health', async () => ({ ok: true }))
  app.get('/ready', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`)
      return { ok: true, db: true }
    } catch {
      return reply.code(503).send({ ok: false, db: false })
    }
  })

  // The question bank is public: the app works without an account. One document, cached per version,
  // sent pre-compressed and revalidated with ETag / If-None-Match.
  const bank = bankCache(db)
  app.get('/api/bank', async (req, reply) => {
    const doc = await bank()
    const etag = `"${doc.version}"`
    reply.header('ETag', etag).header('Cache-Control', 'public, max-age=300').header('Vary', 'Accept-Encoding')
    if (req.headers['if-none-match'] === etag) return reply.code(304).send()
    const accept = String(req.headers['accept-encoding'] ?? '')
    reply.type('application/json; charset=utf-8')
    if (/\bbr\b/.test(accept)) return reply.header('Content-Encoding', 'br').send(doc.brotli)
    if (/\bgzip\b/.test(accept)) return reply.header('Content-Encoding', 'gzip').send(doc.gzip)
    return reply.send(doc.json)
  })

  // every other /api route needs a valid Supabase access token
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.url.startsWith('/api/') || req.method === 'OPTIONS') return
    if (req.method === 'GET' && (req.url === '/api/bank' || req.url.startsWith('/api/bank?'))) return
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'sign-in required' })
    try {
      req.user = await verify(token)
    } catch {
      return reply.code(401).send({ error: 'invalid or expired token' })
    }
  })

  app.get('/api/state', async (req) => readState(db, req.user.id))

  app.put('/api/state', async (req) => {
    const { state } = z.object({ state: State }).parse(req.body)
    await db.transaction((tx) => writeState(tx, req.user.id, state as unknown as UserState))
    return readState(db, req.user.id)
  })

  app.put('/api/settings', async (req) => {
    const { settings } = z.object({ settings: Settings }).parse(req.body)
    const userId = req.user.id
    await db
      .insert(userSettings)
      .values({ userId, data: settings })
      .onConflictDoUpdate({ target: userSettings.userId, set: { data: settings, updatedAt: new Date() } })
    return { ok: true }
  })

  app.put('/api/dictionary/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { entry } = z.object({ entry: Entry }).parse(req.body)
    if (entry.id !== id) return reply.code(400).send({ error: 'id mismatch' })
    const userId = req.user.id
    const row = { word: entry.word, data: entry as never, updatedAt: new Date() }
    await db
      .insert(dictionaryEntries)
      .values({ userId, id, ...row })
      .onConflictDoUpdate({ target: [dictionaryEntries.userId, dictionaryEntries.id], set: row })
    return { ok: true }
  })

  app.delete('/api/dictionary/:id', async (req) => {
    const { id } = req.params as { id: string }
    await db
      .delete(dictionaryEntries)
      .where(and(eq(dictionaryEntries.userId, req.user.id), eq(dictionaryEntries.id, id)))
    return { ok: true }
  })

  app.put('/api/history/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { record } = z.object({ record: Attempt }).parse(req.body)
    if (record.id !== id) return reply.code(400).send({ error: 'id mismatch' })
    const userId = req.user.id
    const row = { finishedAt: record.finishedAt, data: record as never, updatedAt: new Date() }
    await db
      .insert(attempts)
      .values({ userId, id, ...row })
      .onConflictDoUpdate({ target: [attempts.userId, attempts.id], set: row })
    return { ok: true }
  })

  app.delete('/api/history/:id', async (req) => {
    const { id } = req.params as { id: string }
    await db.delete(attempts).where(and(eq(attempts.userId, req.user.id), eq(attempts.id, id)))
    return { ok: true }
  })

  app.put('/api/session', async (req) => {
    const { session } = z.object({ session: Session.nullable() }).parse(req.body)
    const userId = req.user.id
    if (!session) {
      await db.delete(activeSessions).where(eq(activeSessions.userId, userId))
    } else {
      await db
        .insert(activeSessions)
        .values({ userId, data: session as never })
        .onConflictDoUpdate({ target: activeSessions.userId, set: { data: session as never, updatedAt: new Date() } })
    }
    return { ok: true }
  })

  app.put('/api/custom-bank', async (req) => {
    const { customBank } = z.object({ customBank: Bank }).parse(req.body)
    const userId = req.user.id
    await db
      .insert(customBanks)
      .values({ userId, data: customBank as never })
      .onConflictDoUpdate({ target: customBanks.userId, set: { data: customBank as never, updatedAt: new Date() } })
    return { ok: true }
  })

  return app
}
