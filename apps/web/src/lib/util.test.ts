import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, formatPercent, pluralUk, range, shuffle, uid } from './util'

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const input = Object.freeze(range(50))
    const out = shuffle(input)
    expect(out).not.toBe(input)
    expect([...out].sort((a, b) => a - b)).toEqual(input)
  })

  it('handles empty and single-item lists', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['a'])).toEqual(['a'])
  })
})

describe('range', () => {
  it('counts from zero', () => {
    expect(range(0)).toEqual([])
    expect(range(4)).toEqual([0, 1, 2, 3])
  })
})

describe('uid', () => {
  it('starts with the prefix and does not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uid('s')))
    expect(ids.size).toBe(500)
    for (const id of ids) expect(id.startsWith('s')).toBe(true)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [59.9, '00:59'],
    [61, '01:01'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [-5, '00:00'],
  ])('%s s → %s', (sec, text) => expect(formatClock(sec)).toBe(text))
})

describe('formatDuration', () => {
  it.each([
    [0, '0 с'],
    [45, '45 с'],
    [60, '1 хв'],
    [125, '2 хв 5 с'],
    [3600, '1 год'],
    [3725, '1 год 2 хв'],
  ])('%s s → %s', (sec, text) => expect(formatDuration(sec)).toBe(text))
})

describe('formatPercent', () => {
  it('uses a decimal comma and one digit', () => {
    expect(formatPercent(0)).toBe('0,0%')
    expect(formatPercent(66.666)).toBe('66,7%')
    expect(formatPercent(100)).toBe('100,0%')
  })
})

describe('pluralUk', () => {
  const word = (n: number) => pluralUk(n, 'питання-1', 'питання-2', 'питань')
  it.each([
    [1, 'питання-1'],
    [21, 'питання-1'],
    [101, 'питання-1'],
    [2, 'питання-2'],
    [4, 'питання-2'],
    [22, 'питання-2'],
    [0, 'питань'],
    [5, 'питань'],
    [11, 'питань'],
    [12, 'питань'],
    [14, 'питань'],
    [111, 'питань'],
  ])('%s → %s', (n, form) => expect(word(n)).toBe(form))
})
