// Account sync is switched on by build-time variables (apps/web/.env.local or GitHub Actions
// variables). Without them the app keeps working purely in this browser, as before.

const env = import.meta.env

export const CLOUD = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '',
  supabaseKey: ((env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY) as string | undefined) ?? '',
  apiUrl: (env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '',
}

export const cloudEnabled = Boolean(CLOUD.supabaseUrl && CLOUD.supabaseKey && CLOUD.apiUrl)
