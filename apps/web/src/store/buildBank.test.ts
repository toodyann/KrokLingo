import { describe, expect, it } from 'vitest'
import { bank, EN_COLLECTION, question, UK_COLLECTION } from '../test/fixtures'
import { buildBank } from './buildBank'

const en = [question('e1'), question('e2')]
const uk = [question('u1', { collection: 'uk-col' })]

describe('buildBank', () => {
  it('draws tests from the chosen language, but looks up every question', () => {
    const b = bank([...en, ...uk], { lang: 'uk' })
    expect(b.lang).toBe('uk')
    expect(b.questions.map((q) => q.id)).toEqual(['u1'])
    expect(b.collections).toEqual([UK_COLLECTION])
    expect(b.questionById.get('e1')).toBeDefined()
    expect(b.langs).toEqual([
      { lang: 'en', count: 2 },
      { lang: 'uk', count: 1 },
    ])
  })

  it('falls back to English when the chosen language has no questions', () => {
    const b = bank(en, { lang: 'uk' })
    expect(b.lang).toBe('en')
    expect(b.questions).toHaveLength(2)
    expect(b.langs).toEqual([{ lang: 'en', count: 2 }])
  })

  it('treats collections without a language as English', () => {
    const b = buildBank(
      { collections: [{ id: 'old', name: 'Old' }], questions: [question('o1', { collection: 'old' })], passages: [] },
      { collections: [], questions: [], passages: [] },
      'en',
    )
    expect(b.langOf(b.questions[0])).toBe('en')
  })

  it('adds imported questions and their unknown topics', () => {
    const custom = {
      collections: [{ id: 'mine', name: 'Мій', custom: true }],
      questions: [question('c1', { collection: 'mine', topic: 'my-topic' })],
      passages: [{ id: 'p1', title: 'Reading', text: 'Text' }],
    }
    const b = bank(en, { custom })
    expect(b.questions.map((q) => q.id)).toEqual(['e1', 'e2', 'c1'])
    expect(b.collections.map((c) => c.id)).toEqual([EN_COLLECTION.id, 'mine'])
    expect(b.topics.at(-1)).toEqual({ id: 'my-topic', name: 'my-topic' })
    expect(b.passageById.get('p1')?.title).toBe('Reading')
  })

  it('names unknown topics by their id', () => {
    expect(bank(en).topicName('no-such-topic')).toBe('no-such-topic')
  })

  it('is empty before the server bank arrives', () => {
    const b = buildBank(null, { collections: [], questions: [], passages: [] }, 'en')
    expect(b.questions).toEqual([])
    expect(b.langs).toEqual([])
  })
})
