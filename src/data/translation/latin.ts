// Latin anatomical names ("a. carotis externa", "n. facialis", "m. masseter") and common Latin terms.
// A name is translated only when every word is known; otherwise the translator says what kind of
// structure it is and leaves the Latin untranslated instead of guessing.

/** Abbreviated structure types that start a Latin anatomical name. */
export const LATIN_HEADS: Record<string, { uk: string; plural?: boolean }> = {
  a: { uk: 'артерія' },
  aa: { uk: 'артерії', plural: true },
  v: { uk: 'вена' },
  vv: { uk: 'вени', plural: true },
  n: { uk: 'нерв' },
  nn: { uk: 'нерви', plural: true },
  m: { uk: 'м\'яз' },
  mm: { uk: 'м\'язи', plural: true },
  r: { uk: 'гілка' },
  rr: { uk: 'гілки', plural: true },
  lig: { uk: 'зв\'язка' },
  ligg: { uk: 'зв\'язки', plural: true },
  gl: { uk: 'залоза' },
  for: { uk: 'отвір' },
  proc: { uk: 'відросток' },
}

/** Latin words of anatomical names → Ukrainian adjective / noun as used in the name. */
export const LATIN_WORDS: Record<string, string> = {
  carotis: 'сонна',
  externa: 'зовнішня',
  interna: 'внутрішня',
  communis: 'загальна',
  facialis: 'лицевий',
  lingualis: 'язиковий',
  maxillaris: 'верхньощелепний',
  mandibularis: 'нижньощелепний',
  alveolaris: 'альвеолярний',
  inferior: 'нижній',
  superior: 'верхній',
  posterior: 'задній',
  anterior: 'передній',
  medius: 'середній',
  media: 'середня',
  infraorbitalis: 'підочноямковий',
  mentalis: 'підборідний',
  buccalis: 'щічний',
  palatinus: 'піднебінний',
  palatina: 'піднебінна',
  major: 'великий',
  minor: 'малий',
  temporalis: 'скроневий',
  masseter: 'жувальний',
  pterygoideus: 'крилоподібний',
  lateralis: 'латеральний',
  medialis: 'медіальний',
  trigeminus: 'трійчастий',
  vagus: 'блукаючий',
  hypoglossus: 'під\'язиковий',
  glossopharyngeus: 'язикоглотковий',
  ophthalmica: 'очна',
  ophthalmicus: 'очний',
  subclavia: 'підключична',
  vertebralis: 'хребтова',
  jugularis: 'яремна',
  thyroidea: 'щитоподібна',
  sublingualis: 'під\'язиковий',
  submandibularis: 'піднижньощелепний',
  parotidea: 'привушна',
  incisivus: 'різцевий',
  nasopalatinus: 'носопіднебінний',
  auricularis: 'вушний',
  occipitalis: 'потиличний',
  digastricus: 'двочеревцевий',
  mylohyoideus: 'щелепно-під\'язиковий',
  geniohyoideus: 'підборідно-під\'язиковий',
  genioglossus: 'підборідно-язиковий',
  orbicularis: 'коловий',
  oris: '+рота',
  oculi: '+ока',
  buccinator: 'щічний',
  sternocleidomastoideus: 'груднинно-ключично-соскоподібний',
  transversa: 'поперечна',
  faciei: '+обличчя',
  cerebri: '+мозку',
  communicans: 'сполучна',
  ductus: 'протока',
  choledochus: 'спільна жовчна',
  cysticus: 'міхурова',
  hepaticus: 'печінкова',
  dexter: 'правий',
  sinister: 'лівий',
  radialis: 'променевий',
  ulnaris: 'ліктьовий',
  medianus: 'серединний',
  axillaris: 'пахвовий',
  musculocutaneus: 'м\'язово-шкірний',
  petrosus: 'кам\'янистий',
  profundus: 'глибокий',
  magnus: 'великий',
  oculomotorius: 'окоруховий',
  trochlearis: 'блоковий',
  abducens: 'відвідний',
  accessorius: 'додатковий',
  auriculotemporalis: 'вушно-скроневий',
  pharyngeus: 'глотковий',
  angularis: 'кутовий',
  submentalis: 'підпідборідний',
  supraorbitalis: 'надочноямковий',
  retromandibularis: 'занижньощелепний',
  stylomastoidea: 'шило-соскоподібна',
  meningea: 'оболонна',
  sympathicus: 'симпатичний',
  supraclaviculares: 'надключичні',
  alveolares: 'альвеолярні',
  superiores: 'верхні',
  inferiores: 'нижні',
  posteriores: 'задні',
  palatini: 'піднебінні',
  minores: 'малі',
  nasales: 'носові',
  deltoideus: 'дельтоподібний',
  biceps: 'двоголовий',
  triceps: 'триголовий',
  brachii: '+плеча',
  surae: '+литки',
  brachialis: 'плечовий',
  coracobrachialis: 'дзьобо-плечовий',
  palatoglossus: 'піднебінно-язиковий',
  palatopharyngeus: 'піднебінно-глотковий',
  stylopharyngeus: 'шило-глотковий',
  risorius: 'сміховий',
  procerus: 'гордеців',
  levator: '*підіймач',
  depressor: '*опускач',
  corrugator: '*зморщувач',
  supercilii: '+брови',
  anguli: '+кута',
  veli: '+завіски',
  transversus: 'поперечний',
  colli: '+шиї',
}

/**
 * All words of a Latin name known → full translation; otherwise null (do not guess).
 * Values: plain = adjective, placed before the noun in reverse Latin order ("a. carotis externa" →
 * "зовнішня сонна артерія"); "+…" = genitive after the noun ("brachii" → "плеча");
 * "*…" = a noun joined to the structure type ("levator" → "м'яз-підіймач").
 */
export function translateLatinName(head: string, words: string[]): string | null {
  const h = LATIN_HEADS[head.toLowerCase()]
  if (!h) return null
  const parts = words.map((w) => LATIN_WORDS[w.toLowerCase()])
  if (parts.some((p) => !p)) return null
  const adjectives = parts.filter((p) => p[0] !== '+' && p[0] !== '*').reverse()
  const nouns = parts.filter((p) => p[0] === '*').map((p) => p.slice(1))
  const genitives = parts.filter((p) => p[0] === '+').map((p) => p.slice(1))
  const core = nouns.length ? `${h.uk}-${nouns.join('-')}` : h.uk
  return [...adjectives, core, ...genitives].join(' ')
}

/** Meaning of one Latin word for display (without the placement markers). */
export function latinWord(word: string): string | undefined {
  const v = LATIN_WORDS[word.toLowerCase()]
  return v && (v[0] === '+' || v[0] === '*') ? v.slice(1) : v
}
