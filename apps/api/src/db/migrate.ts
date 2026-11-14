// Applies the SQL migrations in ./drizzle to DATABASE_URL: npm run db:migrate
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { connect } from './client.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const { db, close } = connect(url)
await migrate(db as never, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
await close()
console.log('migrations applied')
