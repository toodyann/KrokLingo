// Context-aware translation of a clicked word.
//
// The unit of translation is chosen first (abbreviation, Latin anatomical name, verified phrase, or a
// single word), then the translation is taken from the highest-priority source that has it:
//   1. the user's own translation for this question      (user-context)
//   2. the user's own translation everywhere              (user)
//   3. a translation verified for this question           (question)
//   4. a verified medical phrase / abbreviation / Latin   (phrase, abbr, latin)
//   5. the dictionary sense that the sentence points to   (context)
//   6. the general dictionary meaning                     (dictionary)
//   7. nothing — reported as unknown, never invented      (none)
// Online machine translation is not part of this: the UI may ask for it only after "none".

import { GLOSSARY } from '../data/glossary'
import { lookupAbbreviation } from '../data/translation/abbreviations'
import { LATIN_HEADS, LATIN_WORDS, latinWord, translateLatinName } from '../data/translation/latin'
import { PHRASES, type Phrase } from '../data/translation/phrases'
import { QUESTION_TERMS } from '../data/translation/questionTerms'
import { SENSES, type Sense } from '../data/translation/senses'
import type { Certainty, DictEntry, LexicalUnit, ResolutionSource } from '../types'
import { lemmaCandidates, normalizeWord } from './lemmatize'
import { analyzeText, sentenceOf, type AnalyzedText } from './text'

export interface ClickContext {
  /** Whole text the word was clicked in. */
  text: string
  /** Index of the clicked token in analyzeText(text).tokens. */
  index: number
  /** Question (or passage) id the text belongs to. */
  contextId?: string
  /** Surrounding text that gives extra cues, e.g. the question stem for a click in an answer option. */
  related?: string
}

export interface Resolution {
  /** Dictionary key of the unit: base form of a word or the phrase. */
  key: string
  kind: LexicalUnit
  /** Clicked token as written. */
  clicked: string
  /** Base form of the clicked word. */
  lemma: string
  /** The unit as written in the sentence ("root canals", "n. facialis"). */
  unitText: string
  /** Empty when unknown. */
  translation: string
  /** For phrases: what the clicked word means inside the phrase. */
  wordMeaning?: string
  source: ResolutionSource
  certainty: Certainty
  /** Other possible meanings when the choice is not certain. */
  alternatives: string[]
  /** Short explanation shown under the translation (e.g. why it is uncertain). */
  hint?: string
  senseId?: string
  sentence: string
  contextId?: string
}

/** Read access to the user's dictionary by key. */
export type UserLexicon = (key: string) => DictEntry | undefined

// ---------- lexicon helpers ----------

const known = (w: string) => GLOSSARY.has(w) || w in SENSES

/** Base form of a word: the first candidate the lexicon knows, else the most plausible morphological base. */
export function baseForm(raw: string): string {
  const cands = lemmaCandidates(raw)
  return cands.find(known) ?? cands[0]
}

const candidateCache = new Map<string, Set<string>>()
function candidates(raw: string): Set<string> {
  let s = candidateCache.get(raw)
  if (!s) {
    s = new Set(lemmaCandidates(raw))
    if (candidateCache.size > 5000) candidateCache.clear()
    candidateCache.set(raw, s)
  }
  return s
}

const PHRASE_INDEX = new Map<string, Phrase[]>()
for (const p of PHRASES) {
  for (const w of new Set(p.words)) {
    const list = PHRASE_INDEX.get(w) ?? []
    list.push(p)
    PHRASE_INDEX.set(w, list)
  }
}

interface Span {
  start: number
  end: number // inclusive token index
}

/** Longest phrase (by word count) whose tokens cover `index` within one sentence. */
function matchPhrase<T extends { words: string[] }>(
  a: AnalyzedText,
  index: number,
  pool: Iterable<T>,
): (Span & { item: T }) | null {
  let best: (Span & { item: T }) | null = null
  const sentence = a.tokens[index].sentence
  for (const item of pool) {
    const n = item.words.length
    for (let s = Math.max(0, index - n + 1); s <= index; s++) {
      const e = s + n - 1
      if (e >= a.tokens.length) break
      let ok = true
      for (let k = 0; k < n && ok; k++) {
        const t = a.tokens[s + k]
        ok = t.sentence === sentence && candidates(t.text).has(item.words[k])
      }
      if (ok && (!best || n > best.end - best.start + 1)) best = { start: s, end: e, item }
    }
  }
  return best
}

function phrasesFor(token: string): Phrase[] {
  const out = new Set<Phrase>()
  for (const c of candidates(token)) for (const p of PHRASE_INDEX.get(c) ?? []) out.add(p)
  return [...out]
}

function spanText(a: AnalyzedText, span: Span): string {
  return a.text.slice(a.tokens[span.start].start, a.tokens[span.end].end)
}

// ---------- sense selection ----------

interface SenseChoice {
  sense: Sense
  confident: boolean
  alternatives: string[]
}

const has = (list: string[] | undefined, raw: string | undefined) =>
  !!raw && !!list && [...candidates(raw)].some((c) => list.includes(c))

/** Scores each sense against the sentence. Commits only when one sense is clearly ahead. */
export function chooseSense(senses: Sense[], a: AnalyzedText, index: number, related: string[] = []): SenseChoice {
  const t = a.tokens[index]
  const same = (i: number) => a.tokens[i]?.sentence === t.sentence
  const prev = same(index - 1) ? a.tokens[index - 1].text : undefined
  const next = same(index + 1) ? a.tokens[index + 1].text : undefined
  const window = a.tokens.filter((x, i) => i !== index && x.sentence === t.sentence)

  const scored = senses.map((sense) => {
    let score = 0
    if (has(sense.prev, prev)) score += 3
    if (has(sense.next, next)) score += 3
    let cueHits = 0
    for (const w of window) if (has(sense.cues, w.text)) cueHits++
    // related text (question stem for an option) counts, but less than the word's own sentence
    let relatedHits = 0
    for (const w of related) if (has(sense.cues, w) || has(sense.next, w)) relatedHits++
    score += Math.min(cueHits, 3) + Math.min(relatedHits, 2) * 0.75
    if (sense.medical) score += 0.5
    return { sense, score }
  })
  scored.sort((x, y) => y.score - x.score)
  const [best, second] = scored
  const margin = best.score - (second?.score ?? 0)
  const confident = senses.length === 1 || (best.score >= 2.5 && margin >= 1)
  return { sense: best.sense, confident, alternatives: scored.slice(1).map((s) => s.sense.uk) }
}

// ---------- part of speech (noun vs verb senses of one dictionary entry) ----------

/** Ukrainian infinitive: "спричиняти", "відкривати(ся)", "рости". */
const UK_VERB = /(?:ти|тися|тись|ть|ться)(?:\s*\([^)]*\))?$/
const DETERMINERS = new Set(
  'the a an this these those his her its their our my your any no some each every whose one two several many much'.split(
    ' ',
  ),
)
const VERB_BEFORE = new Set(
  'to can may will would should must might could does did do not cannot often usually also'.split(' '),
)
const BE = new Set('is are was were be been being'.split(' '))

/** A rough guess from the neighbours; undefined when the sentence does not tell. */
export function guessPartOfSpeech(a: AnalyzedText, index: number): 'noun' | 'verb' | undefined {
  const t = a.tokens[index]
  const same = (i: number) => a.tokens[i]?.sentence === t.sentence
  const prev = same(index - 1) ? a.tokens[index - 1].text.toLowerCase() : undefined
  const next = same(index + 1) ? a.tokens[index + 1].text.toLowerCase() : undefined
  const word = t.text.toLowerCase()
  if (prev && VERB_BEFORE.has(prev)) return 'verb'
  if (/(?:ed|ing)$/.test(word) && (next === 'by' || (prev && BE.has(prev)))) return 'verb' // "caused by", "is damaged"
  if (prev && DETERMINERS.has(prev)) return 'noun'
  if (next === 'of') return 'noun'
  if (/ed$/.test(word) && baseForm(word) !== word) return 'verb'
  return undefined
}

// ---------- Latin anatomical names ----------

const LATIN_ENDING = /(?:is|us|a|ae|um|i|or|ix|ex|es|ei|ii)$/

/** "n. facialis", "a. carotis externa": a head abbreviation followed by a period and Latin words. */
function matchLatin(a: AnalyzedText, index: number): (Span & { head: string; words: string[] }) | null {
  for (let h = index; h >= Math.max(0, index - 4); h--) {
    const head = a.tokens[h]
    if (!(head.text.toLowerCase() in LATIN_HEADS) || a.text[head.end] !== '.') continue
    const words: string[] = []
    let e = h
    for (let k = h + 1; k < a.tokens.length && words.length < 4; k++) {
      const w = a.tokens[k]
      const lower = w.text.toLowerCase()
      if (w.sentence !== head.sentence) break
      if (!(lower in LATIN_WORDS) && (!LATIN_ENDING.test(lower) || lower.length <= 3 || known(baseForm(lower)))) break
      if (/[A-Z]/.test(w.text[0]) && words.length > 0) break
      words.push(w.text)
      e = k
    }
    if (words.length && index <= e) return { start: h, end: e, head: head.text, words }
  }
  return null
}

// ---------- resolution ----------

const resolutionCache = new Map<string, Resolution>()

/** Built-in resolution (steps 3–7), memoized per click position. */
function resolveBuiltin(ctx: ClickContext): Resolution {
  const cacheKey = `${ctx.contextId ?? ''}\u0000${ctx.index}\u0000${ctx.text}\u0000${ctx.related ?? ''}`
  const hit = resolutionCache.get(cacheKey)
  if (hit) return hit

  const a = analyzeText(ctx.text)
  const token = a.tokens[ctx.index]
  const sentence = sentenceOf(a, ctx.index)
  const lemma = token.kind === 'abbr' ? token.text : baseForm(token.text)
  const base = { clicked: token.text, lemma, sentence, contextId: ctx.contextId, alternatives: [] as string[] }
  const result = ((): Resolution => {
    // 3. verified for this question (phrases first, then the word)
    const terms = ctx.contextId ? QUESTION_TERMS[ctx.contextId] : undefined
    if (terms) {
      const multi = Object.keys(terms)
        .filter((k) => k.includes(' '))
        .map((k) => ({ words: k.split(' '), key: k }))
      const m = matchPhrase(a, ctx.index, multi)
      if (m) {
        return {
          ...base,
          key: m.item.key,
          kind: 'phrase',
          unitText: spanText(a, m),
          translation: terms[m.item.key],
          source: 'question',
          certainty: 'verified',
        }
      }
      const single = [...candidates(token.text)].find((c) => c in terms)
      if (single) {
        return {
          ...base,
          key: single,
          kind: 'word',
          unitText: token.text,
          translation: terms[single],
          source: 'question',
          certainty: 'verified',
        }
      }
    }

    // 4a. abbreviations (case-sensitive table)
    if (token.kind === 'abbr' || /^[A-Z]{2,}$/.test(token.text)) {
      const abbr = lookupAbbreviation(token.text) ?? lookupAbbreviation(token.text.replace(/s$/, ''))
      if (abbr) {
        return {
          ...base,
          key: token.text,
          kind: 'abbr',
          unitText: token.text,
          translation: abbr,
          source: 'abbr',
          certainty: 'verified',
        }
      }
      if (token.kind === 'abbr' && !known(token.text.toLowerCase())) {
        return {
          ...base,
          key: token.text,
          kind: 'abbr',
          unitText: token.text,
          translation: '',
          source: 'none',
          certainty: 'unknown',
          hint: 'Абревіатура — розшифровки немає у вбудованому довіднику.',
        }
      }
    }

    // 4b. Latin anatomical names
    const latin = matchLatin(a, ctx.index)
    if (latin) {
      const key = `${latin.head.toLowerCase()}. ${latin.words.join(' ').toLowerCase()}`
      const full = translateLatinName(latin.head, latin.words)
      const head = LATIN_HEADS[latin.head.toLowerCase()]
      const clickedLatin = latinWord(token.text)
      if (full) {
        return {
          ...base,
          key,
          kind: 'latin',
          unitText: spanText(a, latin),
          translation: full,
          wordMeaning: clickedLatin,
          source: 'latin',
          certainty: 'verified',
        }
      }
      return {
        ...base,
        key,
        kind: 'latin',
        unitText: spanText(a, latin),
        translation: '',
        wordMeaning: clickedLatin,
        source: 'none',
        certainty: 'unknown',
        hint: `Латинська анатомічна назва (${head.uk}${clickedLatin ? `; ${token.text} — ${clickedLatin}` : ''}). Повного перекладу немає у довіднику.`,
      }
    }

    // 4c. verified medical phrases
    const phrase = matchPhrase(a, ctx.index, phrasesFor(token.text))
    if (phrase) {
      const p = phrase.item
      const wordInPhrase = p.words[ctx.index - phrase.start]
      return {
        ...base,
        key: p.key,
        kind: 'phrase',
        unitText: spanText(a, phrase),
        translation: p.uk,
        wordMeaning: p.gloss[wordInPhrase],
        source: 'phrase',
        certainty: 'verified',
      }
    }

    // 5. a sense picked by the sentence
    const senseKey = [...candidates(token.text)].find((c) => c in SENSES)
    if (senseKey) {
      const related = ctx.related ? analyzeText(ctx.related).tokens.map((t) => t.text) : []
      const choice = chooseSense(SENSES[senseKey], a, ctx.index, related)
      return {
        ...base,
        key: senseKey,
        lemma: senseKey,
        kind: 'word',
        unitText: token.text,
        translation: choice.sense.uk,
        senseId: choice.sense.id,
        source: choice.confident ? 'context' : 'dictionary',
        certainty: choice.confident ? 'likely' : 'uncertain',
        alternatives: choice.confident ? [] : choice.alternatives,
        hint: choice.confident
          ? undefined
          : 'Значення залежить від контексту, а речення не вказує на нього однозначно.',
      }
    }

    // 6. general dictionary meaning
    const word = [...candidates(token.text)].find((c) => GLOSSARY.has(c))
    if (word) {
      let senses = GLOSSARY.get(word)!
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      // noun and verb senses side by side ("причина; спричиняти"): let the neighbours pick one
      const verbs = senses.filter((s) => UK_VERB.test(s))
      const nouns = senses.filter((s) => !UK_VERB.test(s))
      const pos = verbs.length && nouns.length ? guessPartOfSpeech(a, ctx.index) : undefined
      if (pos) {
        const picked = pos === 'verb' ? verbs : nouns
        const rest = senses.filter((s) => !picked.includes(s))
        if (picked.length === 1) {
          return {
            ...base,
            key: word,
            lemma: word,
            kind: 'word',
            unitText: token.text,
            translation: picked[0],
            source: 'context',
            certainty: 'likely',
            alternatives: [],
          }
        }
        senses = [...picked, ...rest]
      }
      return {
        ...base,
        key: word,
        lemma: word,
        kind: 'word',
        unitText: token.text,
        translation: senses[0],
        source: 'dictionary',
        certainty: senses.length > 1 ? 'uncertain' : 'likely',
        alternatives: senses.slice(1),
        hint: senses.length > 1 ? 'У словнику кілька значень; контекст не дозволяє вибрати одне.' : undefined,
      }
    }

    // hyphenated compound: translate the parts, but say it is assembled
    const norm = normalizeWord(token.text)
    if (norm.includes('-')) {
      const parts = norm.split('-').filter(Boolean)
      const translated = parts.map((p) => {
        const c = lemmaCandidates(p).find((x) => GLOSSARY.has(x))
        return c ? GLOSSARY.get(c)!.split(/[;,]/)[0].trim() : null
      })
      if (translated.every(Boolean)) {
        return {
          ...base,
          key: norm,
          kind: 'word',
          unitText: token.text,
          translation: translated.join(' + '),
          source: 'dictionary',
          certainty: 'uncertain',
          hint: 'Складено з перекладів частин слова — перевірте значення.',
        }
      }
    }

    // 7. unknown: say so
    return {
      ...base,
      key: lemma,
      kind: 'word',
      unitText: token.text,
      translation: '',
      source: 'none',
      certainty: 'unknown',
    }
  })()

  if (resolutionCache.size > 1000) resolutionCache.clear()
  resolutionCache.set(cacheKey, result)
  return result
}

/** Full resolution with the user's own translations on top (steps 1–2). */
export function resolveTranslation(ctx: ClickContext, user: UserLexicon = () => undefined): Resolution {
  const builtin = resolveBuiltin(ctx)
  const unitEntry = user(builtin.key)
  const wordEntry = builtin.kind !== 'word' && builtin.lemma !== builtin.key ? user(builtin.lemma) : undefined
  const id = ctx.contextId

  // 1. user's translation for this question (for the unit, then for the clicked word)
  for (const entry of [unitEntry, wordEntry]) {
    const own = id ? entry?.contextual?.[id] : undefined
    if (own) {
      const unit = entry === unitEntry ? {} : { key: entry!.word, kind: 'word' as const, unitText: builtin.clicked }
      return {
        ...builtin,
        ...unit,
        translation: own,
        source: 'user-context',
        certainty: 'verified',
        alternatives: [],
        hint: undefined,
      }
    }
  }
  // 2. user's translation everywhere
  if (unitEntry?.source === 'manual' && unitEntry.translation) {
    return {
      ...builtin,
      translation: unitEntry.translation,
      source: 'user',
      certainty: 'verified',
      alternatives: [],
      hint: undefined,
    }
  }
  return builtin
}

/**
 * Text saved to the dictionary: an uncertain choice keeps its alternatives ("відросток; процес"),
 * so a guess never ends up stored as if it were the only meaning.
 */
export function storedText(r: Pick<Resolution, 'translation' | 'certainty' | 'alternatives'>): string {
  if (!r.translation) return ''
  return r.certainty === 'uncertain' && r.alternatives.length
    ? [r.translation, ...r.alternatives].join('; ')
    : r.translation
}

/** Resolve a click given the raw text and the clicked token index. */
export function translateClick(
  text: string,
  index: number,
  contextId?: string,
  user?: UserLexicon,
  related?: string,
): Resolution {
  return resolveTranslation({ text, index, contextId, related }, user)
}

/**
 * Re-resolves a stored, non-manual entry against the current built-in data, so updates to the
 * dictionary reach it. Returns null when the entry must be left alone (the user's own text).
 */
export function refreshedTranslation(
  entry: DictEntry,
): { translation: string; certainty: Certainty; origin: ResolutionSource } | null {
  if (entry.source === 'manual') return null
  if (entry.context && entry.surface) {
    const a = analyzeText(entry.context)
    const index = a.tokens.findIndex((t) => t.text.toLowerCase() === entry.surface!.toLowerCase())
    if (index >= 0) {
      const r = resolveBuiltin({ text: entry.context, index, contextId: entry.contextId })
      if (r.key === entry.word && r.translation)
        return { translation: storedText(r), certainty: r.certainty, origin: r.source }
    }
  }
  // no stored context (older entries): the word on its own
  const r = resolveBuiltin({ text: entry.word, index: 0 })
  if (r.key === entry.word && r.translation)
    return { translation: storedText(r), certainty: r.certainty, origin: r.source }
  return null
}

/** Online fallback (MyMemory public API, opt-in in settings) for units the offline data does not know. */
export async function lookupOnline(word: string, signal?: AbortSignal): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|uk`
  const timeout = AbortSignal.timeout(6000)
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!res.ok) return null
  const data = (await res.json()) as {
    responseStatus?: number | string
    responseData?: { translatedText?: string }
  }
  const text = data.responseData?.translatedText?.trim()
  if (!text || Number(data.responseStatus) !== 200) return null
  if (/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(text)) return null
  if (text.toLowerCase() === word.toLowerCase()) return null
  return text
}

/** Indexes of tokens that belong to a verified phrase saved in the user's dictionary (for the marker). */
export function knownPhraseTokens(text: string, isKnown: (key: string) => boolean): Set<number> {
  const out = new Set<number>()
  const a = analyzeText(text)
  for (let i = 0; i < a.tokens.length; i++) {
    if (out.has(i)) continue
    const m = matchPhrase(a, i, phrasesFor(a.tokens[i].text))
    if (m && isKnown(m.item.key)) for (let k = m.start; k <= m.end; k++) out.add(k)
  }
  return out
}

/** Keys under which a single word could already be stored in the user's dictionary. */
export function storageKeys(raw: string): string[] {
  return lemmaCandidates(raw)
}
