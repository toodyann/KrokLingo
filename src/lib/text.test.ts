import { describe, expect, it } from 'vitest'
import { analyzeText, isAbbreviation, sentenceOf } from './text'

const words = (s: string) => analyzeText(s).tokens.map((t) => t.text)

describe('tokenizer', () => {
  it('keeps hyphenated terms whole', () => {
    expect(words('Gram-positive cocci on X-ray')).toEqual(['Gram-positive', 'cocci', 'on', 'X-ray'])
    expect(words('A 40-year-old man')).toEqual(['A', 'year-old', 'man'])
  })

  it('keeps apostrophes inside words', () => {
    expect(words("Wharton's duct and the patient’s tongue")).toEqual(["Wharton's", 'duct', 'and', 'the', 'patient’s', 'tongue'])
  })

  it('keeps abbreviations with digits and mixed case whole', () => {
    expect(words('HbA1c, IgG, B12, pCO2 and ATP')).toEqual(['HbA1c', 'IgG', 'B12', 'pCO2', 'and', 'ATP'])
    for (const a of ['HbA1c', 'IgG', 'B12', 'pCO2', 'ATP', 'NSAIDs', 'cAMP']) expect(isAbbreviation(a)).toBe(true)
    for (const w of ['Tooth', 'X-ray', 'A', 'patient']) expect(isAbbreviation(w)).toBe(false)
  })

  it('reads Greek letters as part of a word', () => {
    expect(words('β-lactamase')).toEqual(['β-lactamase'])
  })
})

describe('sentence bounds', () => {
  it('does not split Latin anatomical abbreviations', () => {
    const a = analyzeText('The n. facialis was damaged. Which muscle is affected?')
    const i = a.tokens.findIndex((t) => t.text === 'facialis')
    expect(sentenceOf(a, i)).toBe('The n. facialis was damaged.')
  })

  it('splits ordinary sentences', () => {
    const a = analyzeText('The pulp is inflamed. What is the diagnosis?')
    const i = a.tokens.findIndex((t) => t.text === 'diagnosis')
    expect(sentenceOf(a, i)).toBe('What is the diagnosis?')
  })
})
