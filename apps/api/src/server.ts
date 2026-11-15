// Starts the API. Configuration comes from the environment (see .env.example).
import { buildApp } from './app.ts'
import { readBankFiles, seedBank } from './bank.ts'
import { supabaseVerifier } from './auth.ts'
import { connect } from './db/client.ts'
import { runMigrations } from './db/migrations.ts'

const env = process.env
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

const { db, close } = connect(env.DATABASE_URL, { max: Number(env.DB_POOL_MAX ?? 5) })

// Hosts without a pre-deploy step (e.g. Render's free plan) apply migrations on start.
if (env.MIGRATE_ON_START === 'true') {
  await runMigrations(db)
  console.log('migrations applied')
}

// The question bank ships with the API (./bank/*.json); copy it into the database when it changed.
if (env.SEED_BANK_ON_START !== 'false') {
  const source = readBankFiles()
  const seeded = await seedBank(db, source)
  console.log(`question bank ${source.version}: ${source.questions.length} questions${seeded ? ' (seeded)' : ''}`)
}

const app = await buildApp({
  db,
  verify: supabaseVerifier({ supabaseUrl: env.SUPABASE_URL, jwtSecret: env.SUPABASE_JWT_SECRET }),
  corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5173,https://toodyann.github.io')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  logger: env.LOG !== 'false',
})

const port = Number(env.PORT ?? 8787)
await app.listen({ port, host: env.HOST ?? '0.0.0.0' })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close()
    await close()
    process.exit(0)
  })
}
