import { describe, expect, it } from 'vitest'
import type { DictEntry } from '../types'
import { analyzeText } from './text'
import { refreshedTranslation, resolveTranslation, storedText, type UserLexicon } from './translate'

/** Resolve the n-th occurrence of `word` in `text`. */
function at(
  text: string,
  word: string,
  opts: { contextId?: string; related?: string; user?: UserLexicon; nth?: number } = {},
) {
  const tokens = analyzeText(text).tokens
  const hits = tokens.map((t, i) => (t.text === word ? i : -1)).filter((i) => i >= 0)
  const index = hits[opts.nth ?? 0]
  if (index === undefined) throw new Error(`"${word}" not in text`)
  return resolveTranslation({ text, index, contextId: opts.contextId, related: opts.related }, opts.user)
}

function entry(word: string, patch: Partial<DictEntry> = {}): DictEntry {
  return {
    id: 'e-' + word,
    word,
    translation: '',
    note: '',
    source: 'builtin',
    addedAt: 0,
    updatedAt: 0,
    lookups: 1,
    learned: false,
    box: 0,
    ...patch,
  }
}
const lexicon =
  (...entries: DictEntry[]): UserLexicon =>
  (k) =>
    entries.find((e) => e.word === k.toLowerCase())

describe('medical phrases', () => {
  it.each([
    ['Anaesthesia of the mental nerve was performed.', 'mental', 'mental nerve', 'підборідний нерв', 'підборідний'],
    ['Anaesthesia of the mental nerve was performed.', 'nerve', 'mental nerve', 'підборідний нерв', undefined],
    [
      'The root canals were obturated.',
      'canals',
      'root canal',
      'кореневий канал',
      'канал'.length ? undefined : undefined,
    ],
    ['Dental plaque accumulates near the gingiva.', 'plaque', 'dental plaque', 'зубний наліт', 'наліт'],
    ['The oral cavity is lined with mucosa.', 'cavity', 'oral cavity', 'порожнина рота', 'порожнина'],
    ['Tooth decay is common in children.', 'decay', 'tooth decay', 'карієс зубів', 'карієс (руйнування)'],
  ])('%s — "%s" → %s', (text, word, key, uk, meaning) => {
    const r = at(text, word)
    expect(r.kind).toBe('phrase')
    expect(r.key).toBe(key)
    expect(r.translation).toBe(uk)
    expect(r.source).toBe('phrase')
    expect(r.certainty).toBe('verified')
    if (meaning) expect(r.wordMeaning).toBe(meaning)
  })

  it('matches inflected phrase words and keeps the written form', () => {
    const r = at('Both mental foramina were visible on the X-ray.', 'foramina')
    expect(r.key).toBe('mental foramen')
    expect(r.unitText).toBe('mental foramina')
  })

  it('does not join words across a sentence boundary', () => {
    const r = at('He has a mental illness. Nerve damage was excluded.', 'mental')
    expect(r.kind).toBe('word')
  })
})

describe('ambiguous words follow the sentence', () => {
  it('process: projection of a bone vs course of a disease', () => {
    expect(at('A fracture of the coronoid process of the mandible was found.', 'process').translation).toBe(
      'вінцевий відросток',
    )
    expect(at('The process of the maxilla was fractured.', 'process').translation).toBe('відросток')
    expect(at('This inflammatory process involves the pulp.', 'process').translation).toBe('запальний процес')
    const r = at('The process spread to the surrounding tissues during the chronic stage.', 'process')
    expect(r.translation).toBe('процес')
    expect(r.source).toBe('context')
  })

  it('left: side vs past of "leave"', () => {
    expect(at('Hypertrophy of the left ventricle was detected.', 'left').translation).toBe('лівий шлуночок')
    expect(at('Pain radiates to the left arm.', 'left').translation).toBe('лівий')
    expect(at('The patient has left the hospital.', 'left').translation).toMatch(/залишив/)
  })

  it('mental: chin vs mind without a fixed phrase', () => {
    expect(at('Swelling in the mental region of the mandible.', 'mental').translation).toBe('підборідна ділянка')
    expect(at('Her mental state worsened after the stress.', 'mental').translation).toBe('психічний, розумовий')
  })

  it('plaque: dental deposit vs atherosclerotic plaque', () => {
    expect(at('Plaque on the teeth was stained before brushing.', 'Plaque').translation).toBe('наліт (зубний)')
    expect(at('A plaque narrowed the coronary artery lumen.', 'plaque').translation).toBe('бляшка')
  })

  it('culture and medium in microbiology', () => {
    expect(at('The material was inoculated on a culture medium.', 'medium').translation).toBe('поживне середовище')
    expect(at('A pure culture was isolated from the pus.', 'culture').translation).toBe('чиста культура')
    expect(at('Colonies grew on the medium after incubation.', 'medium').translation).toBe('середовище (поживне)')
  })

  it('options use the question stem as extra context', () => {
    const stem = 'Which drug should be prescribed for the treatment?'
    expect(at('Antibacterial agent', 'agent', { related: stem }).translation).toBe('засіб, препарат')
    expect(at('Causative agent', 'agent').translation).toBe('збудник')
  })

  it('flags a guess instead of presenting it as certain', () => {
    const r = at('Describe the process.', 'process')
    expect(r.certainty).toBe('uncertain')
    expect(r.alternatives.length).toBeGreaterThan(0)
    expect(r.hint).toBeTruthy()
    expect(storedText(r)).toContain(';') // stored with alternatives
  })
})

describe('abbreviations and Latin names', () => {
  it('translates known abbreviations case-sensitively', () => {
    expect(at('Low ATP levels were found.', 'ATP').translation).toMatch(/АТФ/)
    expect(at('HbA1c is elevated.', 'HbA1c').translation).toMatch(/глікований/)
    expect(at('Serum IgG was measured.', 'IgG').translation).toBe('імуноглобулін G')
  })

  it('reports an unknown abbreviation instead of inventing a meaning', () => {
    const r = at('The XQZT test was positive.', 'XQZT')
    expect(r.kind).toBe('abbr')
    expect(r.translation).toBe('')
    expect(r.certainty).toBe('unknown')
  })

  it('translates a Latin anatomical name as one unit', () => {
    const r = at('Branches of a. carotis externa supply the face.', 'carotis')
    expect(r.kind).toBe('latin')
    expect(r.translation).toBe('зовнішня сонна артерія')
    expect(at('The n. facialis was damaged.', 'facialis').translation).toBe('лицевий нерв')
  })

  it('does not guess an unknown Latin name', () => {
    const r = at('The n. obscurus was damaged.', 'obscurus')
    expect(r.kind).toBe('latin')
    expect(r.translation).toBe('')
    expect(r.hint).toMatch(/нерв/)
  })
})

describe('priority of sources', () => {
  const text = 'The process of the maxilla was fractured.'

  it('the user’s translation for this question beats everything', () => {
    const user = lexicon(
      entry('process', {
        source: 'manual',
        translation: 'процес (мій)',
        contextual: { 'q-1': 'відросток верхньої щелепи' },
      }),
    )
    const r = at(text, 'process', { contextId: 'q-1', user })
    expect(r.translation).toBe('відросток верхньої щелепи')
    expect(r.source).toBe('user-context')
  })

  it('the user’s general translation beats built-in data', () => {
    const user = lexicon(entry('process', { source: 'manual', translation: 'мій переклад' }))
    const r = at(text, 'process', { contextId: 'q-2', user })
    expect(r.source).toBe('user')
    expect(r.translation).toBe('мій переклад')
  })

  it('an automatic entry never overrides the built-in choice', () => {
    const user = lexicon(entry('process', { source: 'builtin', translation: 'процес' }))
    expect(at(text, 'process', { user }).translation).toBe('відросток')
  })

  it('a translation verified for the question beats the phrase list', () => {
    const r = at('The lingual nerve was injured.', 'lingual', { contextId: 'anat-01' })
    expect(r.source).toBe('question')
    expect(r.translation).toBe('язиковий нерв')
  })

  it('an unknown word is reported as unknown', () => {
    const r = at('Sialoxyzine was administered.', 'Sialoxyzine')
    expect(r.translation).toBe('')
    expect(r.source).toBe('none')
    expect(r.certainty).toBe('unknown')
  })
})

describe('stored entries and dictionary updates', () => {
  it('re-resolves automatic entries from their saved context', () => {
    const e = entry('process', {
      translation: 'процес; відросток',
      surface: 'process',
      context: 'The process of the maxilla was fractured.',
    })
    expect(refreshedTranslation(e)?.translation).toBe('відросток')
  })

  it('never overwrites the user’s own translation', () => {
    const e = entry('process', {
      source: 'manual',
      translation: 'моє',
      context: 'The process of the maxilla was fractured.',
      surface: 'process',
    })
    expect(refreshedTranslation(e)).toBeNull()
  })

  it('refreshes old entries without context by the word alone', () => {
    expect(refreshedTranslation(entry('tooth', { translation: 'старий переклад' }))?.translation).toBe('зуб')
    expect(refreshedTranslation(entry('mental nerve', { translation: 'старий' }))?.translation).toBe('підборідний нерв')
  })
})

describe('noun or verb sense from the neighbours', () => {
  it('picks the verb after a modal or in the passive, the noun after a determiner', () => {
    expect(at('The cause of the disease is unknown.', 'cause').translation).toBe('причина')
    expect(at('Streptococci may cause caries.', 'cause').translation).toBe('спричиняти, викликати')
    expect(at('The ulcer was caused by trauma.', 'caused').translation).toBe('спричиняти, викликати')
  })

  it('keeps both senses when nothing decides', () => {
    const r = at('Damage occurs.', 'Damage')
    expect(['likely', 'uncertain']).toContain(r.certainty)
  })
})

describe('Latin names written without a space', () => {
  it('reads "m.biceps brachii" as one name', () => {
    const r = at('Paralysis of m.biceps brachii was noted.', 'biceps')
    expect(r.kind).toBe('latin')
    expect(r.translation).toBe("двоголовий м'яз плеча")
  })
})

describe('Latin word order', () => {
  it('reverses adjectives and puts genitives after the noun', () => {
    expect(at('Damage to the n. alveolaris inferior.', 'alveolaris').translation).toBe('нижній альвеолярний нерв')
    expect(at('The m. orbicularis oris contracts.', 'oris').translation).toBe("коловий м'яз рота")
    expect(at('The m. levator anguli oris is paralysed.', 'levator').translation).toBe("м'яз-підіймач кута рота")
  })
})
