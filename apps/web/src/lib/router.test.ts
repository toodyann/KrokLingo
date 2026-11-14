import { describe, expect, it } from 'vitest'
import { legacyHashPath, link, parsePath } from './router'

const BASE = '/KrokLingo/'

describe('path routing', () => {
  it('reads routes from real paths under the app base', () => {
    expect(parsePath('/KrokLingo/', BASE)).toEqual({ name: 'home' })
    expect(parsePath('/KrokLingo/tests', BASE)).toEqual({ name: 'tests' })
    expect(parsePath('/KrokLingo/tests/', BASE)).toEqual({ name: 'tests' })
    expect(parsePath('/KrokLingo/results/abc123', BASE)).toEqual({ name: 'results', id: 'abc123' })
    expect(parsePath('/KrokLingo/results', BASE)).toEqual({ name: 'history' })
  })

  it('works with the development base too', () => {
    expect(parsePath('/dictionary', '/')).toEqual({ name: 'dictionary' })
    expect(parsePath('/', '/')).toEqual({ name: 'home' })
  })

  it('sends unknown paths to the home screen', () => {
    expect(parsePath('/KrokLingo/nope', BASE)).toEqual({ name: 'home' })
  })

  it('builds links under the base', () => {
    expect(link('', BASE)).toBe('/KrokLingo/')
    expect(link('tests', BASE)).toBe('/KrokLingo/tests')
    expect(link('/results/x', BASE)).toBe('/KrokLingo/results/x')
  })

  it('converts old hash links', () => {
    expect(legacyHashPath('#/flashcards')).toBe('flashcards')
    expect(legacyHashPath('#/')).toBe('')
    expect(legacyHashPath('#section')).toBeNull()
    expect(legacyHashPath('')).toBeNull()
  })
})
