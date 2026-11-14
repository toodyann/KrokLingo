import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Db } from './client.ts'

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url))

/** Applies pending SQL migrations from ./drizzle (already applied ones are skipped). */
export async function runMigrations(db: Db): Promise<void> {
  await migrate(db as never, { migrationsFolder: MIGRATIONS_DIR })
}
