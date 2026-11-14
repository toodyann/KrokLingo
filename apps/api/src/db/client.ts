import { drizzle } from 'drizzle-orm/postgres-js'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import postgres from 'postgres'
import * as schema from './schema.ts'

/** Any Postgres-backed Drizzle database with our schema (postgres.js in production, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export function connect(url: string): { db: Db; close: () => Promise<void> } {
  // Supabase's pooler (port 6543, transaction mode) does not support prepared statements
  const client = postgres(url, { prepare: false, max: 5 })
  return { db: drizzle(client, { schema }) as unknown as Db, close: () => client.end() }
}
