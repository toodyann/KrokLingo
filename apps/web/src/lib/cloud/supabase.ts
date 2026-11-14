import type { SupabaseClient } from '@supabase/supabase-js'
import { CLOUD } from './config'

let client: Promise<SupabaseClient> | null = null

/** Supabase Auth client, loaded as its own chunk only when sync is configured. */
export function getSupabase(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(CLOUD.supabaseUrl, CLOUD.supabaseKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  )
  return client
}

/** Google sign-in; Supabase brings the user back to the app's start page. */
export async function signInWithGoogle(): Promise<void> {
  const sb = await getSupabase()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
  if (error) throw error
}

export async function accessToken(): Promise<string | null> {
  const sb = await getSupabase()
  const { data } = await sb.auth.getSession()
  return data.session?.access_token ?? null
}
