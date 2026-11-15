import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EMPTY_STATE, isEmptyState, mergeStates, type UserState } from '@kroklingo/shared'
import { CLOUD, cloudEnabled } from '../lib/cloud/config'
import { accessToken, getSupabase, signInWithGoogle } from '../lib/cloud/supabase'
import { createApi, diffState, type Api } from '../lib/cloud/sync'

/** Which account the data cached in this browser belongs to (null: collected before signing in). */
const OWNER_KEY = 'kroklingo:v1:owner'

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function writeOwner(id: string | null) {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // per-browser convenience only
  }
}

export interface AccountUser {
  id: string
  email?: string
  name?: string
  avatarUrl?: string
}

export type SyncStatus = 'off' | 'signed-out' | 'connecting' | 'synced' | 'saving' | 'offline' | 'error'

export interface Account {
  /** Sync is configured for this build. */
  enabled: boolean
  user: AccountUser | null
  status: SyncStatus
  error?: string
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

/**
 * Keeps the store and the user's account in step. On sign-in the account is loaded (and anything
 * collected in this browser before signing in is merged into it); afterwards every change of the
 * state is written to the API, retried when offline. Signing out clears this browser's copy.
 */
export function useCloudSync(state: UserState, apply: (next: UserState) => void): Account {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [status, setStatus] = useState<SyncStatus>(cloudEnabled ? 'connecting' : 'off')
  const [error, setError] = useState<string>()

  const api = useRef<Api | null>(null)
  const confirmed = useRef<UserState | null>(null) // last state the server has
  const adoptNext = useRef(false) // take the next rendered state as confirmed (after apply)
  const latest = useRef(state)
  const flushing = useRef(false)
  const retry = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    latest.current = state
    if (adoptNext.current) {
      adoptNext.current = false
      confirmed.current = state
    }
  })

  const flush = useCallback(async function flushChanges(): Promise<void> {
    const client = api.current
    if (!client || !confirmed.current || flushing.current) return
    const target = latest.current
    const ops = diffState(confirmed.current, target)
    if (!ops.length) return
    flushing.current = true
    setStatus('saving')
    try {
      for (const op of ops) await client.send(op)
      confirmed.current = target
      setStatus('synced')
      setError(undefined)
    } catch (err) {
      setStatus(navigator.onLine ? 'error' : 'offline')
      setError(err instanceof Error ? err.message : String(err))
      clearTimeout(retry.current)
      retry.current = setTimeout(() => void flushChanges(), 20_000)
    } finally {
      flushing.current = false
    }
    if (latest.current !== target) void flushChanges() // changes made while saving
  }, [])

  // write changes shortly after they happen
  useEffect(() => {
    if (!confirmed.current) return
    const t = setTimeout(() => void flush(), 400)
    return () => clearTimeout(t)
  }, [state, flush])

  useEffect(() => {
    const online = () => void flush()
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [flush])

  // first load after signing in: bring the account and this browser together
  const connect = useCallback(
    async (u: AccountUser) => {
      setStatus('connecting')
      const client = createApi(CLOUD.apiUrl, accessToken)
      try {
        const server = await client.getState()
        const owner = readOwner()
        const local = latest.current
        let result = server
        if (owner === u.id || (owner === null && !isEmptyState(local))) {
          result = mergeStates(server, local)
          if (JSON.stringify(result) !== JSON.stringify(server)) result = await client.putState(result)
        }
        api.current = client
        writeOwner(u.id)
        adoptNext.current = true
        apply(result)
        setStatus('synced')
        setError(undefined)
      } catch (err) {
        setStatus(navigator.onLine ? 'error' : 'offline')
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [apply],
  )

  useEffect(() => {
    if (!cloudEnabled) return
    let unsubscribe = () => {}
    // undefined = not known yet, so the first "no session" also leaves the connecting state
    let current: string | null | undefined = undefined
    void getSupabase().then((sb) => {
      const onSession = (
        session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null,
      ) => {
        const id = session?.user.id ?? null
        if (id === current) return
        current = id
        if (!session) {
          api.current = null
          confirmed.current = null
          setUser(null)
          setStatus('signed-out')
          return
        }
        const meta = session.user.user_metadata ?? {}
        const u: AccountUser = {
          id: session.user.id,
          email: session.user.email,
          name: (meta.full_name ?? meta.name) as string | undefined,
          avatarUrl: (meta.avatar_url ?? meta.picture) as string | undefined,
        }
        setUser(u)
        void connect(u)
      }
      void sb.auth.getSession().then(({ data }) => onSession(data.session))
      const { data } = sb.auth.onAuthStateChange((_event, session) => onSession(session))
      unsubscribe = () => data.subscription.unsubscribe()
    })
    return () => unsubscribe()
  }, [connect])

  const signIn = useCallback(async () => {
    setError(undefined)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const signOut = useCallback(async () => {
    await flush()
    const sb = await getSupabase()
    await sb.auth.signOut()
    api.current = null
    confirmed.current = null
    writeOwner(null)
    apply(EMPTY_STATE) // the data stays in the account, not in this browser
  }, [apply, flush])

  return { enabled: cloudEnabled, user, status, error, signIn, signOut }
}
