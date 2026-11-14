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

function undouble(stem: string): string | null {
  const n = stem.length
  if (n >= 3 && stem[n - 1] === stem[n - 2] && !VOWELS.includes(stem[n - 1]) && !'lsz'.includes(stem[n - 1])) {
    return stem.slice(0, -1)
  }
  return null
}

export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/^'+|'+$/g, '')
}

/** Ordered list of possible dictionary forms for a word, most likely first. */
export function lemmaCandidates(raw: string): string[] {
  const w = normalizeWord(raw)
  const out: string[] = []
  const add = (s: string | null | undefined) => {
    if (s && s.length > 0 && !out.includes(s)) out.push(s)
  }

  add(w)
  add(IRREGULAR[w])

  let base = w
  if (base.endsWith("'s")) {
    base = base.slice(0, -2)
    add(base)
    add(IRREGULAR[base])
  } else if (base.endsWith("s'")) {
    base = base.slice(0, -1)
    add(base)
    add(IRREGULAR[base])
  }

  const len = base.length
  // plurals / 3rd person
  if (len > 4 && base.endsWith('ies')) add(base.slice(0, -3) + 'y')
  if (len > 4 && base.endsWith('ves')) {
    add(base.slice(0, -3) + 'f')
    add(base.slice(0, -3) + 'fe')
  }
  if (len > 3 && base.endsWith('es')) add(base.slice(0, -2))
  if (len > 3 && base.endsWith('s') && !base.endsWith('ss') && !base.endsWith('us') && !base.endsWith('is')) {
    add(base.slice(0, -1))
  }
  // past tense / participle
  if (len > 4 && base.endsWith('ied')) add(base.slice(0, -3) + 'y')
  if (len > 3 && base.endsWith('ed')) {
    const stem = base.slice(0, -2)
    add(stem)
    add(stem + 'e')
    add(undouble(stem))
    add(base.slice(0, -1)) // e.g. "used" -> "use"
  }
  // gerund / present participle
  if (len > 4 && base.endsWith('ing')) {
    const stem = base.slice(0, -3)
    add(stem)
    add(stem + 'e')
    add(undouble(stem))
  }
  // adverbs
  if (len > 4 && base.endsWith('ily')) add(base.slice(0, -3) + 'y')
  if (len > 4 && base.endsWith('ally')) add(base.slice(0, -2))
  if (len > 3 && base.endsWith('ly')) {
    add(base.slice(0, -2))
    add(base.slice(0, -2) + 'le')
  }
  // Latin / Greek plurals
  if (len > 3 && base.endsWith('ae')) add(base.slice(0, -1))
  if (len > 3 && base.endsWith('i')) add(base.slice(0, -1) + 'us')
  if (len > 3 && base.endsWith('a')) add(base.slice(0, -1) + 'um')
  // comparatives
  if (len > 4 && base.endsWith('ier')) add(base.slice(0, -3) + 'y')
  if (len > 4 && base.endsWith('er')) {
    add(base.slice(0, -2))
    add(base.slice(0, -1))
    add(undouble(base.slice(0, -2)))
  }
  if (len > 5 && base.endsWith('est')) {
    add(base.slice(0, -3))
    add(base.slice(0, -2))
  }
  return out
}
