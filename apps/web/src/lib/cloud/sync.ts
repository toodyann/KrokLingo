// Turns changes of the in-memory state into API calls. The store keeps the last state the server
// confirmed; after every change the difference becomes a list of small writes. Large changes (a
// restored backup, "delete all data") are sent as one replacement of the whole state.

import { API_ROUTES, type UserState } from '@kroklingo/shared'

export type SyncOp =
  | { kind: 'state'; state: UserState }
  | { kind: 'settings'; settings: NonNullable<UserState['settings']> }
  | { kind: 'entry'; entry: UserState['dictionary'][number] }
  | { kind: 'entry-delete'; id: string }
  | { kind: 'attempt'; record: UserState['history'][number] }
  | { kind: 'attempt-delete'; id: string }
  | { kind: 'session'; session: UserState['session'] }
  | { kind: 'custom-bank'; customBank: NonNullable<UserState['customBank']> }

function diffList<T extends { id: string }>(prev: T[], next: T[], put: (x: T) => SyncOp, del: (id: string) => SyncOp): SyncOp[] {
  const before = new Map(prev.map((x) => [x.id, x]))
  const ops: SyncOp[] = []
  for (const x of next) {
    if (before.get(x.id) !== x) ops.push(put(x)) // new or replaced (state is updated immutably)
    before.delete(x.id)
  }
  for (const id of before.keys()) ops.push(del(id))
  return ops
}

/** Writes that bring the server from `prev` to `next`; one full replacement when there are many. */
export function diffState(prev: UserState, next: UserState, maxOps = 60): SyncOp[] {
  const ops: SyncOp[] = []
  if (next.settings && next.settings !== prev.settings) ops.push({ kind: 'settings', settings: next.settings })
  ops.push(
    ...diffList(
      prev.dictionary,
      next.dictionary,
      (entry) => ({ kind: 'entry', entry }),
      (id) => ({ kind: 'entry-delete', id }),
    ),
  )
  ops.push(
    ...diffList(
      prev.history,
      next.history,
      (record) => ({ kind: 'attempt', record }),
      (id) => ({ kind: 'attempt-delete', id }),
    ),
  )
  if (next.session !== prev.session) ops.push({ kind: 'session', session: next.session })
  if (next.customBank && next.customBank !== prev.customBank) ops.push({ kind: 'custom-bank', customBank: next.customBank })
  if (ops.length > maxOps || (!next.settings && prev.settings)) return [{ kind: 'state', state: next }]
  return ops
}

type Fetcher = (method: 'GET' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<unknown>

/** API client bound to a base URL and a token source. */
export function createApi(baseUrl: string, token: () => Promise<string | null>) {
  const request: Fetcher = async (method, path, body) => {
    const t = await token()
    if (!t) throw new SyncError('not signed in', 401)
    const res = await fetch(baseUrl + path, {
      method,
      headers: { Authorization: `Bearer ${t}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) throw new SyncError(`${method} ${path}: ${res.status}`, res.status)
    return res.json()
  }
  return {
    getState: () => request('GET', API_ROUTES.state) as Promise<UserState>,
    putState: (state: UserState) => request('PUT', API_ROUTES.replaceState, { state }) as Promise<UserState>,
    send(op: SyncOp): Promise<unknown> {
      switch (op.kind) {
        case 'state':
          return request('PUT', API_ROUTES.replaceState, { state: op.state })
        case 'settings':
          return request('PUT', API_ROUTES.settings, { settings: op.settings })
        case 'entry':
          return request('PUT', API_ROUTES.dictionaryEntry(op.entry.id), { entry: op.entry })
        case 'entry-delete':
          return request('DELETE', API_ROUTES.dictionaryEntry(op.id))
        case 'attempt':
          return request('PUT', API_ROUTES.attempt(op.record.id), { record: op.record })
        case 'attempt-delete':
          return request('DELETE', API_ROUTES.attempt(op.id))
        case 'session':
          return request('PUT', API_ROUTES.session, { session: op.session })
        case 'custom-bank':
          return request('PUT', API_ROUTES.customBank, { customBank: op.customBank })
      }
    },
  }
}

export type Api = ReturnType<typeof createApi>

export class SyncError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
