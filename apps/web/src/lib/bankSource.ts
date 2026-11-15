import { API_ROUTES, type BankPayload } from '@kroklingo/shared'
import { refineTopic } from '../data/topics'
import type { Collection, Passage, Question } from '../types'
import { CLOUD } from './cloud/config'

// The question bank lives on the server (GET /api/bank). The last copy is kept in IndexedDB, so
// later visits start at once and work offline; the server is asked for changes in the background.

export interface ServerBank {
  version: string
  collections: Collection[]
  passages: Passage[]
  questions: Question[]
}

export function decodeBank(p: BankPayload): ServerBank {
  return {
    version: p.version,
    collections: p.collections,
    passages: p.passages,
    questions: p.questions.map(([id, collection, topic, text, options, correct, passageId, explanation]) => ({
      id,
      collection,
      topic: refineTopic(topic, text, options),
      text,
      options,
      correct,
      ...(passageId ? { passageId } : {}),
      ...(explanation ? { explanation } : {}),
    })),
  }
}

/* ---------- IndexedDB cache (one record) ---------- */

const DB_NAME = 'kroklingo'
const STORE = 'bank'
const KEY = 'payload'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function readCachedBank(): Promise<BankPayload | null> {
  try {
    const db = await openDb()
    return await new Promise<BankPayload | null>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as BankPayload | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null // private mode, blocked storage: just fetch every time
  }
}

export async function writeCachedBank(payload: BankPayload): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(payload, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // the cache is a convenience
  }
}

/* ---------- network ---------- */

export const bankConfigured = Boolean(CLOUD.apiUrl)

/** The current bank, or null when `version` is still current. Throws when the server can't be reached. */
export async function fetchBank(version?: string, signal?: AbortSignal): Promise<BankPayload | null> {
  if (!bankConfigured) throw new Error('Адресу сервера питань не налаштовано (VITE_API_URL)')
  const res = await fetch(CLOUD.apiUrl + API_ROUTES.bank, {
    headers: version ? { 'If-None-Match': `"${version}"` } : {},
    // our own ETag check decides; the browser cache would only repeat what IndexedDB holds
    cache: 'no-store',
    signal,
  })
  if (res.status === 304) return null
  if (!res.ok) throw new Error(`Сервер питань відповів ${res.status}`)
  return (await res.json()) as BankPayload
}
