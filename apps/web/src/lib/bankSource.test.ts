import type { BankPayload } from '@kroklingo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeBank, fetchBank, readCachedBank } from './bankSource'

vi.mock('./cloud/config', () => ({
  CLOUD: { apiUrl: 'https://api.test', supabaseUrl: '', supabaseKey: '' },
  cloudEnabled: false,
}))

const payload: BankPayload = {
  version: 'abc123',
  collections: [{ id: 'krok-2020', name: 'Krok 2020' }],
  passages: [{ id: 'p1', title: 'Reading', text: 'Text' }],
  questions: [
    ['q1', 'krok-2020', 'anatomy', 'Which bone?', ['Mandible', 'Maxilla'], 0, null, null],
    ['q2', 'krok-2020', 'reading', 'According to the text?', ['Yes', 'No'], 1, 'p1', 'Because.'],
  ],
}

afterEach(() => vi.unstubAllGlobals())

describe('decodeBank', () => {
  it('turns compact rows into questions and drops empty fields', () => {
    const bank = decodeBank(payload)
    expect(bank.version).toBe('abc123')
    expect(bank.questions[0]).toEqual({
      id: 'q1',
      collection: 'krok-2020',
      topic: expect.any(String),
      text: 'Which bone?',
      options: ['Mandible', 'Maxilla'],
      correct: 0,
    })
    expect(bank.questions[1]).toMatchObject({ passageId: 'p1', explanation: 'Because.', correct: 1 })
  })
})

describe('fetchBank', () => {
  const respond = (status: number, body?: unknown) => {
    const fetch = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }))
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('asks for the bank without the browser cache', async () => {
    const fetch = respond(200, payload)
    await expect(fetchBank()).resolves.toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/api/bank',
      expect.objectContaining({ cache: 'no-store', headers: {} }),
    )
  })

  it('sends the cached version and returns null when it is still current', async () => {
    const fetch = respond(304)
    await expect(fetchBank('abc123')).resolves.toBeNull()
    expect(fetch.mock.calls[0]).toEqual([
      expect.any(String),
      expect.objectContaining({ headers: { 'If-None-Match': '"abc123"' } }),
    ])
  })

  it('throws on a server error', async () => {
    respond(503)
    await expect(fetchBank()).rejects.toThrow('503')
  })
})

describe('readCachedBank', () => {
  it('returns null where IndexedDB is unavailable instead of failing', async () => {
    await expect(readCachedBank()).resolves.toBeNull()
  })
})
