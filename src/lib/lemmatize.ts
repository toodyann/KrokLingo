// Lightweight English lemmatizer: produces candidate base forms for a word form,
// so that "teeth", "caused", "bacteria" can be found in the glossary as
// "tooth", "cause", "bacterium".

const IRREGULAR: Record<string, string> = {
  teeth: 'tooth',
  children: 'child',
  men: 'man',
  women: 'woman',
  feet: 'foot',
  people: 'person',
  is: 'be',
  are: 'be',
  am: 'be',
  was: 'be',
  were: 'be',
  been: 'be',
  being: 'be',
  has: 'have',
  had: 'have',
  having: 'have',
  does: 'do',
  did: 'do',
  done: 'do',
  went: 'go',
  gone: 'go',
  took: 'take',
  taken: 'take',
  gave: 'give',
  given: 'give',
  made: 'make',
  found: 'find',
  saw: 'see',
  seen: 'see',
  lost: 'lose',
  left: 'leave',
  began: 'begin',
  begun: 'begin',
  became: 'become',
  brought: 'bring',
  thought: 'think',
  told: 'tell',
  known: 'know',
  knew: 'know',
  ate: 'eat',
  eaten: 'eat',
  fell: 'fall',
  fallen: 'fall',
  bled: 'bleed',
  broke: 'break',
  broken: 'break',
  chose: 'choose',
  chosen: 'choose',
  felt: 'feel',
  kept: 'keep',
  led: 'lead',
  met: 'meet',
  paid: 'pay',
  ran: 'run',
  said: 'say',
  sent: 'send',
  shown: 'show',
  spread: 'spread',
  stood: 'stand',
  understood: 'understand',
  wore: 'wear',
  worn: 'wear',
  written: 'write',
  threw: 'throw',
  thrown: 'throw',
  grew: 'grow',
  grown: 'grow',
  swollen: 'swell',
  wrote: 'write',
  better: 'good',
  best: 'good',
  worse: 'bad',
  worst: 'bad',
  less: 'little',
  least: 'little',
  further: 'far',
  bacteria: 'bacterium',
  foramina: 'foramen',
  apices: 'apex',
  fungi: 'fungus',
  criteria: 'criterion',
  phenomena: 'phenomenon',
  papillae: 'papilla',
  striae: 'stria',
  lamellae: 'lamella',
  vertebrae: 'vertebra',
  mucosae: 'mucosa',
  ganglia: 'ganglion',
  stomata: 'stoma',
  diagnoses: 'diagnosis',
  analyses: 'analysis',
  lumina: 'lumen',
  corpora: 'corpus',
  cervices: 'cervix',
  indices: 'index',
  matrices: 'matrix',
  lying: 'lie',
  dying: 'die',
  tying: 'tie',
  mice: 'mouse',
  lice: 'louse',
  geese: 'goose',
  oxen: 'ox',
  data: 'datum',
  media: 'medium',
  stimuli: 'stimulus',
  nuclei: 'nucleus',
  bronchi: 'bronchus',
  alveoli: 'alveolus',
  bacilli: 'bacillus',
  cocci: 'coccus',
  his: 'he',
  him: 'he',
  her: 'she',
  them: 'they',
  their: 'they',
  its: 'it',
  us: 'we',
  our: 'we',
  me: 'i',
  my: 'i',
}

const VOWELS = 'aeiou'

/**
 * Function words are never the base form of an inflected content word: without this,
 * "notes"/"noted" resolved to "not" (не) and "uses"/"used" to "us".
 */
const CLOSED_CLASS = new Set(
  'a an the and or but nor so yet of to in on at by for from with as is am are was were be been it its this that these those not no us we he she they i me my his her our their him them do does did has had have if than then there here who whom what which when where why how all any each few more most other some such only own same too very can will just'.split(
    ' ',
  ),
)

const isVowel = (c: string | undefined) => !!c && VOWELS.includes(c)

function undouble(stem: string): string | null {
  const n = stem.length
  if (n >= 3 && stem[n - 1] === stem[n - 2] && !isVowel(stem[n - 1]) && !'lsz'.includes(stem[n - 1])) {
    return stem.slice(0, -1)
  }
  return null
}

/** consonant-vowel-consonant ending ("hop", "rat", "not"): such a stem gets a doubled letter before -ed/-ing,
 *  so "hoped", "rated", "noted" come from "hope", "rate", "note". */
function endsCVC(stem: string): boolean {
  const n = stem.length
  if (n < 2) return false
  const c2 = stem[n - 1]
  const v = stem[n - 2]
  const c1 = stem[n - 3]
  return !isVowel(c2) && !'wxy'.includes(c2) && isVowel(v) && (n === 2 || !isVowel(c1))
}

export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/^'+|'+$/g, '')
}

/** Ordered list of possible dictionary forms for a word, most likely first. The surface form always comes first. */
export function lemmaCandidates(raw: string): string[] {
  const w = normalizeWord(raw)
  const out: string[] = []
  const derived = (s: string | null | undefined) => {
    if (s && s.length > 1 && !out.includes(s) && !CLOSED_CLASS.has(s)) out.push(s)
  }
  out.push(w)
  if (IRREGULAR[w] && !out.includes(IRREGULAR[w])) out.push(IRREGULAR[w])

  let base = w
  if (base.endsWith("'s")) {
    base = base.slice(0, -2)
    derived(base)
    derived(IRREGULAR[base])
  } else if (base.endsWith("s'")) {
    base = base.slice(0, -1)
    derived(base)
    derived(IRREGULAR[base])
  }

  const len = base.length
  // plurals / 3rd person: "-es" only after sibilants and -o ("glasses", "boxes", "heroes"); otherwise drop "-s"
  if (len > 4 && base.endsWith('ies')) derived(base.slice(0, -3) + 'y')
  if (len > 4 && base.endsWith('ves')) {
    derived(base.slice(0, -3) + 'f')
    derived(base.slice(0, -3) + 'fe')
  }
  if (len > 4 && base.endsWith('ses')) derived(base.slice(0, -2) + 'is') // crises -> crisis, analyses -> analysis
  if (len > 3 && /(?:s|x|z|ch|sh|o)es$/.test(base)) derived(base.slice(0, -2))
  if (len > 3 && base.endsWith('s') && !/(?:ss|us|is)$/.test(base)) derived(base.slice(0, -1))

  // past tense / participle and gerund share the stem rules
  for (const suffix of ['ed', 'ing']) {
    if (len < suffix.length + 2 || !base.endsWith(suffix)) continue
    const stem = base.slice(0, -suffix.length)
    if (suffix === 'ed' && stem.endsWith('i')) derived(stem.slice(0, -1) + 'y') // studied -> study
    const single = undouble(stem)
    if (single) {
      derived(single) // stopped -> stop
      derived(stem)
    } else if (endsCVC(stem)) {
      derived(stem + 'e') // hoped -> hope, noted -> note, used -> use
      derived(stem)
    } else {
      derived(stem) // opened -> open, coated -> coat
      derived(stem + 'e') // caused -> cause, increasing -> increase
    }
  }
  // adverbs
  if (len > 4 && base.endsWith('ily')) derived(base.slice(0, -3) + 'y')
  if (len > 4 && base.endsWith('ally')) derived(base.slice(0, -2))
  if (len > 3 && base.endsWith('ly')) {
    derived(base.slice(0, -2))
    derived(base.slice(0, -2) + 'le')
  }
  // Latin / Greek plurals
  if (len > 3 && base.endsWith('ae')) derived(base.slice(0, -1))
  if (len > 3 && base.endsWith('i')) derived(base.slice(0, -1) + 'us')
  if (len > 3 && base.endsWith('a')) derived(base.slice(0, -1) + 'um')
  if (len > 4 && base.endsWith('ina')) derived(base.slice(0, -3) + 'en')
  if (len > 4 && base.endsWith('ices')) {
    derived(base.slice(0, -4) + 'ex')
    derived(base.slice(0, -4) + 'ix')
  }
  // comparatives / superlatives
  if (len > 4 && base.endsWith('ier')) derived(base.slice(0, -3) + 'y')
  if (len > 4 && base.endsWith('er')) {
    derived(undouble(base.slice(0, -2)))
    derived(base.slice(0, -2))
    derived(base.slice(0, -1))
  }
  if (len > 5 && base.endsWith('est')) {
    derived(base.slice(0, -3))
    derived(base.slice(0, -2))
  }
  return out
}
