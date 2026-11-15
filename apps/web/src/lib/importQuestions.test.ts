import { describe, expect, it } from 'vitest'
import { IMPORT_TEMPLATE, parseImport } from './importQuestions'

const OPTS = ['a', 'b', 'c', 'd', 'e']

describe('parseImport', () => {
  it('reads the documented template without errors', () => {
    const r = parseImport(IMPORT_TEMPLATE, 'file.json')
    expect(r.errors).toEqual([])
    expect(r.collection).toMatchObject({ name: IMPORT_TEMPLATE.collection, custom: true })
    expect(r.questions).toHaveLength(2)
    expect(r.questions[0]).toMatchObject({ topic: 'anatomy', correct: 0, collection: r.collection.id })
    expect(r.questions[1]).toMatchObject({ topic: 'reading', correct: 2, passageId: r.passages[0].id })
    expect(r.passages[0].title).toBe('Optional title of the reading text')
  })

  it('accepts a bare array and falls back to the file name', () => {
    const r = parseImport([{ question: 'Q?', answers: OPTS, answer: 'b' }], 'Мій збірник')
    expect(r.collection.name).toBe('Мій збірник')
    expect(r.questions[0]).toMatchObject({ text: 'Q?', correct: 1, topic: 'imported' })
  })

  it.each([
    [0, 0],
    [4, 4],
    ['A', 0],
    [' e ', 4],
    ['3', 2],
  ])('correct %j → index %i', (correct, index) => {
    expect(parseImport([{ text: 'Q', options: OPTS, correct }], 'f').questions[0].correct).toBe(index)
  })

  it('reports each broken question by number and keeps the rest', () => {
    const r = parseImport(
      [
        { text: '', options: OPTS, correct: 0 },
        { text: 'One option', options: ['a'], correct: 0 },
        { text: 'Bad answer', options: OPTS, correct: 'Z' },
        { text: 'Out of range', options: OPTS, correct: 5 },
        { text: 'Too many', options: [...OPTS, ...OPTS], correct: 0 },
        { text: '  Good  ', options: [' x ', 'y'], correct: 1, explanation: ' why ' },
      ],
      'f',
    )
    expect(r.errors.map((e) => e.split(':')[0])).toEqual(['Питання 1', 'Питання 2', 'Питання 3', 'Питання 4', 'Питання 5'])
    expect(r.questions).toEqual([expect.objectContaining({ text: 'Good', options: ['x', 'y'], correct: 1, explanation: 'why' })])
  })

  it('shares one passage between questions with the same text', () => {
    const r = parseImport(
      [
        { text: 'Q1', options: OPTS, correct: 0, passage: 'Long text' },
        { text: 'Q2', options: OPTS, correct: 0, passage: ' Long text ' },
      ],
      'f',
    )
    expect(r.passages).toEqual([expect.objectContaining({ title: 'Reading', text: 'Long text' })])
    expect(r.questions[0].passageId).toBe(r.questions[1].passageId)
  })

  it('rejects files that are not a question list', () => {
    expect(() => parseImport({ items: [] }, 'f')).toThrow(/questions/)
    expect(() => parseImport(null, 'f')).toThrow()
  })
})
