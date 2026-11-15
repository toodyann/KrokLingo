// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAll, loadJSON, saveJSON, STORAGE_KEYS } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('storage', () => {
  it('round-trips JSON under the versioned prefix', () => {
    expect(saveJSON('settings', { threshold: 70 })).toBe(true)
    expect(localStorage.getItem('kroklingo:v1:settings')).toBe('{"threshold":70}')
    expect(loadJSON('settings', null)).toEqual({ threshold: 70 })
  })

  it('returns the fallback for missing or corrupt values', () => {
    expect(loadJSON('history', [])).toEqual([])
    localStorage.setItem('kroklingo:v1:history', '{oops')
    expect(loadJSON('history', [])).toEqual([])
  })

  it('removes a key when saving null', () => {
    saveJSON('session', { id: 's' })
    saveJSON('session', null)
    expect(localStorage.getItem('kroklingo:v1:session')).toBeNull()
  })

  it('reports a failed write (full or blocked storage)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(saveJSON('dictionary', [1])).toBe(false)
  })

  it('clearAll removes only the app’s keys', () => {
    for (const key of Object.values(STORAGE_KEYS)) saveJSON(key, 1)
    localStorage.setItem('other-app', 'keep')
    clearAll()
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
})
