// Text analysis shared by the clickable text and the translator: tokens with offsets and sentence bounds.

export type TokenKind = 'word' | 'abbr'

export interface Token {
  /** Exact text as written, e.g. "Gram-positive", "patient's", "HbA1c". */
  text: string
  start: number
  end: number
  kind: TokenKind
  /** Index of the sentence the token belongs to. */
  sentence: number
}

export interface AnalyzedText {
  text: string
  tokens: Token[]
  /** [start, end) character ranges of sentences. */
  sentences: [number, number][]
}

/**
 * A word: letters (Latin or Greek), digits after the first letter (B12, HbA1c, pCO2), joined by
 * hyphens (X-ray, Gram-positive, year-old) or an inner apostrophe (Wharton's, don't).
 */
const WORD_RE = /[A-Za-zͰ-Ͽ][A-Za-z0-9Ͱ-Ͽ]*(?:['’][A-Za-z]+|-[A-Za-z0-9Ͱ-Ͽ]+)*/g

/** Abbreviations: two or more capitals, or a capital mixed with digits / lowercase inside (HbA1c, IgG, pCO2, cAMP). */
export function isAbbreviation(word: string): boolean {
  if (word.includes('-') || word.includes("'") || word.includes('’')) return false
  if (/^[A-Z]{2,}s?$/.test(word)) return true // ATP, DNA, NSAIDs
  if (/\d/.test(word) && /[A-Za-z]/.test(word)) return true // B12, HbA1c, pO2
  if (/^[a-z]?[A-Z][a-z]?[A-Z]+[a-z0-9]*$/.test(word)) return true // IgG, cAMP, HbS
  return false
}

// Periods after these do not end a sentence ("n. facialis", "e.g. the", "Dr. Smith", initials).
const NO_BREAK =
  /(?:^|[\s(])(?:[A-Za-z]|aa|nn|mm|vv|rr|lig|ligg|art|for|proc|gl|gll|sp|spp|ssp|var|cf|vs|etc|e\.g|i\.e|dr|mr|mrs|ms|st|fig|approx|no|vol)\.$/i

function splitSentences(text: string): [number, number][] {
  const out: [number, number][] = []
  let start = 0
  const re = /[.?!;:]+["')\]]*\s+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const head = text.slice(start, m.index + m[0].trimEnd().length)
    const next = text[m.index + m[0].length]
    if (NO_BREAK.test(head.trimEnd())) continue
    // a sentence starts with a capital letter, digit or opening bracket
    if (next && !/[A-Z0-9("'«]/.test(next)) continue
    out.push([start, m.index + m[0].trimEnd().length])
    start = m.index + m[0].length
  }
  if (start < text.length) out.push([start, text.length])
  return out
}

const cache = new Map<string, AnalyzedText>()

/** Tokens and sentences of a text; memoized because the same texts are rendered and clicked repeatedly. */
export function analyzeText(text: string): AnalyzedText {
  const hit = cache.get(text)
  if (hit) return hit
  const sentences = splitSentences(text)
  const tokens: Token[] = []
  let s = 0
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index
    while (s < sentences.length - 1 && start >= sentences[s][1]) s++
    tokens.push({
      text: m[0],
      start,
      end: start + m[0].length,
      kind: isAbbreviation(m[0]) ? 'abbr' : 'word',
      sentence: s,
    })
  }
  const result = { text, tokens, sentences }
  if (cache.size > 2000) cache.clear()
  cache.set(text, result)
  return result
}

/** The sentence that contains token `index`, trimmed. */
export function sentenceOf(a: AnalyzedText, index: number): string {
  const t = a.tokens[index]
  if (!t) return ''
  const [s, e] = a.sentences[t.sentence] ?? [0, a.text.length]
  return a.text.slice(s, e).trim()
}
