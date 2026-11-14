import { describe, expect, it } from 'vitest'
import { baseForm } from './translate'
import { lemmaCandidates } from './lemmatize'

describe('irregular and plural forms', () => {
  it.each([
    ['teeth', 'tooth'],
    ['bacteria', 'bacterium'],
    ['caused', 'cause'],
    ['children', 'child'],
    ["children's", 'child'],
    ['diseases', 'disease'],
    ['processes', 'process'],
    ['tissues', 'tissue'],
    ['molars', 'molar'],
    ['mucosae', 'mucosa'],
    ['canines', 'canine'],
    ["patient's", 'patient'],
    ["patients'", 'patient'],
    ['opened', 'open'],
    ['stopped', 'stop'],
  ])('%s → %s', (form, lemma) => {
    expect(baseForm(form)).toBe(lemma)
  })
})

describe('morphology rules (candidates in order)', () => {
  it('drops -es only after sibilants or -o', () => {
    expect(lemmaCandidates('rates')[1]).toBe('rate')
    expect(lemmaCandidates('glasses')).toContain('glass')
    expect(lemmaCandidates('sites')).not.toContain('sit')
  })

  it('restores the silent -e after a consonant–vowel–consonant stem', () => {
    expect(lemmaCandidates('hoped')[1]).toBe('hope')
    expect(lemmaCandidates('used')[1]).toBe('use')
    expect(lemmaCandidates('rated')[1]).toBe('rate')
  })

  it('handles Greek and Latin plurals', () => {
    expect(lemmaCandidates('crises')).toContain('crisis')
    expect(lemmaCandidates('analyses')).toContain('analysis')
    expect(lemmaCandidates('nuclei')).toContain('nucleus')
    expect(lemmaCandidates('foramina')).toContain('foramen')
    expect(lemmaCandidates('vertebrae')).toContain('vertebra')
  })
})

describe('false lemmatization that used to give wrong translations', () => {
  it('never reduces a content word to a function word', () => {
    // "notes"/"noted" used to resolve to "not" (не), "uses"/"used" to "us"
    expect(lemmaCandidates('notes')).not.toContain('not')
    expect(lemmaCandidates('noted')).not.toContain('not')
    expect(lemmaCandidates('uses')).not.toContain('us')
    expect(lemmaCandidates('used')).not.toContain('us')
  })

  it('keeps lexicalised -ing nouns as their own words', () => {
    expect(baseForm('fasting')).toBe('fasting') // not "fast" (швидкий)
    expect(baseForm('swelling')).toBe('swelling')
    expect(baseForm('opening')).toBe('opening')
  })
})
