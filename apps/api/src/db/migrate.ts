// Applies the SQL migrations in ./drizzle to DATABASE_URL: npm run db:migrate
import { connect } from './client.ts'
import { runMigrations } from './migrations.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const { db, close } = connect(url)
await runMigrations(db)
await close()
console.log('migrations applied')
