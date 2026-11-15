// Adds questions from further sources to bank/*.json without rebuilding the existing collections.
// Usage: node scripts/booklets/extend.cjs <sources dir> bank
//
// Sources (in <sources dir>/txt, see README.md):
//   bsmu.cols.txt — "Improve your professional English for KROK 1. Dentistry (2006–2022)", BSMU 2023,
//                   column-ordered text (columns.mjs). Official booklet items, correct answer first.
//
// A new item is dropped when the bank already has the same question: the same answer and a stem whose
// words overlap by 75% or more (the guide edits wording slightly). Repeats across years keep the newest.
const fs = require('fs')
const path = require('path')
const { parseBookletText, readText } = require('./parse.cjs')
const { argmax, bookletTopics, scores } = require('./classify.cjs')

const [dir, bankDir] = process.argv.slice(2)
const report = []

/* ---------- similarity ---------- */

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 3))
function jaccard(a, b) {
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  return inter / (a.size + b.size - inter || 1)
}

/** Index of known questions by normalized answer. */
class Known {
  constructor() {
    this.byAnswer = new Map()
  }
  add(text, answer) {
    const key = norm(answer)
    const list = this.byAnswer.get(key) ?? []
    list.push(words(text))
    this.byAnswer.set(key, list)
  }
  has(text, answer) {
    const list = this.byAnswer.get(norm(answer))
    if (!list) return false
    const w = words(text)
    return list.some((k) => jaccard(w, k) >= 0.75)
  }
}

/* ---------- existing bank ---------- */

const files = new Map() // collection id -> parsed file
const dirty = new Set() // collections that gained questions
for (const name of fs.readdirSync(bankDir).filter((n) => n.endsWith('.json'))) {
  files.set(name.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(bankDir, name), 'utf8')))
}
const known = new Known()
const ids = new Set()
for (const f of files.values()) {
  for (const q of f.questions) {
    const [id, , text, options] = Array.isArray(q) ? q : [q.id, q.topic, q.text, q.options]
    // object rows store the correct index; compact rows put the correct option first
    const answer = Array.isArray(q) ? options[0] : options[q.correct]
    known.add(text, answer)
    ids.add(id)
  }
}
report.push(`bank before: ${ids.size} questions in ${files.size} collections`)

/** Line-break hyphens left in the text ("con- centration") and option letters inside options ("B. Fundus"). */
const tidy = (s) =>
  s
    .replace(/(\p{Ll})- (?!and\b|or\b|та\b|і\b|й\b|або\b)(\p{Ll})/gu, '$1$2')
    .replace(/^[A-E]\.\s+/, '')
    .trim()

/**
 * Topic from the question's own wording; the booklet's subject blocks only break ties. (The study guide
 * does not keep the booklets' order, and on items already in the bank this matches better: 88.5% vs 86.7%.)
 */
function topicsFor(items) {
  const { topics } = bookletTopics(items)
  return items.map((it, k) => {
    const s = scores(it)
    const best = argmax(s)
    return s[best] > 0 ? best : topics[k]
  })
}

// ABO groups are printed with symbol glyphs that PDFs lose: "(II)" instead of "A(II)"
const lostGlyph = /(^|[^A-Za-z0-9])\((I{1,3}|IV)\)/
const damaged = (it) => lostGlyph.test(it.text) || it.options.some((o) => lostGlyph.test(o))

function collectionFor(year) {
  const id = `krok-${year}`
  if (!files.has(id)) {
    files.set(id, {
      collection: { id, name: `Буклет ${year}`, description: `Крок 1. Стоматологія, буклет ${year} року` },
      passages: [],
      questions: [],
    })
  }
  return files.get(id)
}

/* ---------- BSMU study guide, 2006–2022 ---------- */

function bsmuYears(raw) {
  const byYear = new Map()
  let year = null
  for (const page of raw.replace(/\r/g, '').split('\f')) {
    const header = page.match(/Krok 1\. Dentistry, professional english, (\d{4}) year/i)
    if (header) year = Number(header[1])
    if (!year) continue
    const body = page
      .split('\n')
      .filter((l) => !/Krok 1\. Dentistry, professional english, \d{4} year/i.test(l) && !/^\s*\d{1,3}\s*$/.test(l))
      .join('\n')
      // some years print options without a space: "A.Transcription"
      .replace(/^(\s*[A-E])\.(?=\S)/gm, '$1. ')
    byYear.set(year, (byYear.get(year) ?? '') + '\n' + body)
  }
  return byYear
}

const bsmuFile = path.join(dir, 'txt/bsmu.cols.txt')
if (fs.existsSync(bsmuFile)) {
  const years = [...bsmuYears(readText(bsmuFile)).entries()].sort((a, b) => b[0] - a[0]) // newest first
  for (const [year, text] of years) {
    const parsed = parseBookletText(text)
    const items = parsed.items
      .filter((it) => !damaged(it))
      .map((it) => ({ ...it, text: tidy(it.text), options: it.options.map(tidy) }))
    const topics = topicsFor(items)
    const file = collectionFor(year)
    let added = 0
    items.forEach((it, k) => {
      const id = `b${year}-${it.n}`
      if (ids.has(id) || known.has(it.text, it.options[0])) return
      file.questions.push([id, topics[k], it.text, it.options])
      dirty.add(file.collection.id)
      known.add(it.text, it.options[0])
      ids.add(id)
      added++
    })
    report.push(`bsmu ${year}: parsed ${parsed.items.length}/${parsed.found} (problems ${parsed.problems.length}), new ${added}`)
  }
}

/* ---------- Ukrainian booklets (emu.dp.ua) ---------- */

const { normalizeUk, scoresUk } = require('./classify-uk.cjs')

const cyrRatio = (s) => {
  const letters = s.match(/\p{L}/gu) || []
  return letters.length ? letters.filter((c) => /[Ѐ-ӿ]/.test(c)).length / letters.length : 0
}
// ABO groups in Ukrainian booklets keep their Cyrillic letters ("А(II)"): only a bare "(II)" is damage
const lostGlyphUk = /(^|[^\p{L}\p{N}])\((I{1,3}|IV)\)/u

/** Text from columns.mjs: drop running heads and sheet codes, Latin option letters, Cyrillic «і». */
function prepUk(raw) {
  return normalizeUk(raw.replace(/\r/g, ''))
    .split('\n')
    .filter((l) => !/Крок\s*1.*Стоматолог/i.test(l) && !/^\s*\d{5,}\s*$/.test(l))
    .join('\n')
    .replace(/^(\s*)([АВСЕ])\.(?=\s)/gm, (m, s, c) => s + { А: 'A', В: 'B', С: 'C', Е: 'E' }[c] + '.')
}

/** The 2019 booklet marks answers with percentages: "100% Автоліз" is correct, "0% …" are not. */
function parsePercentBooklet(raw) {
  const items = []
  let cur = null
  let inOptions = false
  for (const line of raw.replace(/\r/g, '').replace(/\f/g, '\n').split('\n')) {
    const l = line.trim()
    if (!l || /^(Завантажено|HTTP\/|ТЕСТУВАННЯ|Буклет українською)/.test(l)) continue
    const q = l.match(/^(\d{1,3})\.\s+(.*)$/)
    const o = l.match(/^(\d{1,3})%\s+(.*)$/)
    if (q && (!cur || inOptions)) {
      cur = { n: Number(q[1]), text: q[2], options: [], correct: -1 }
      items.push(cur)
      inOptions = false
    } else if (o && cur) {
      if (o[1] === '100') cur.correct = cur.options.length
      cur.options.push(o[2])
      inOptions = true
    } else if (cur) {
      if (inOptions) cur.options[cur.options.length - 1] += ' ' + l
      else cur.text += ' ' + l
    }
  }
  return items
    .filter((it) => it.correct >= 0 && it.options.length >= 4)
    .map((it) => ({ n: it.n, text: it.text, options: [it.options[it.correct], ...it.options.filter((_, i) => i !== it.correct)] }))
}

function ukCollection(year) {
  const id = `uk-${year}`
  if (!files.has(id)) {
    files.set(id, {
      collection: { id, name: `Буклет ${year} (укр.)`, description: `Крок 1. Стоматологія, україномовний буклет ${year} року`, lang: 'uk' },
      passages: [],
      questions: [],
    })
  }
  return files.get(id)
}

const knownUk = new Known()
for (const f of files.values()) {
  if (f.collection.lang !== 'uk') continue
  for (const q of f.questions) {
    knownUk.add(q[2], q[3][0])
    ids.add(q[0])
  }
}

/** Adds one Ukrainian booklet: items with the correct option first, numbered as in the booklet. */
function addUk(year, idPrefix, items, label) {
  const clean = items
    .filter((it) => cyrRatio(it.text + it.options.join(' ')) > 0.6) // English subtests stay out
    .filter((it) => !lostGlyphUk.test(it.text) && !it.options.some((o) => lostGlyphUk.test(o)))
    .map((it) => ({ ...it, text: tidy(it.text), options: it.options.map(tidy).filter((o) => o && o !== '-' && o !== '–') }))
    .filter((it) => it.text.length > 10 && it.options.length >= 4)
  if (!clean.length) {
    report.push(`${label}: nothing usable of ${items.length}`)
    return
  }
  const { topics } = bookletTopics(clean, scoresUk)
  const file = ukCollection(year)
  let added = 0
  clean.forEach((it, k) => {
    const id = `${idPrefix}-${it.n}`
    if (ids.has(id) || knownUk.has(it.text, it.options[0])) return
    file.questions.push([id, topics[k], it.text, it.options])
    knownUk.add(it.text, it.options[0])
    ids.add(id)
    dirty.add(file.collection.id)
    added++
  })
  report.push(`${label}: usable ${clean.length} of ${items.length}, new ${added}`)
}

// All Ukrainian sources go through one list, newest year first, so a question repeated across
// years stays in its newest booklet.
const ukSources = []

// emu.dp.ua PDFs (text via columns.mjs) in <sources>/txt/emu-uk
const emuDir = path.join(dir, 'txt/emu-uk')
if (fs.existsSync(emuDir)) {
  for (const name of fs.readdirSync(emuDir)) {
    if (/Англ|removed/i.test(name)) continue // English exams and the answer-stripped scans
    const variant = name.match(/Стоматологія-(20\d\d)(?:-(\d))?\.txt$/) // "Відповідь А" booklets: answer A
    const yearly = name.match(/\((?:Буклет )?(20\d\d)\)\.txt$/)
    const m = variant ?? yearly
    if (!m) continue
    const year = Number(m[1])
    ukSources.push({
      year,
      prefix: `u${year}${variant?.[2] ? 'v' + variant[2] : ''}`,
      label: `emu ${name}`,
      load() {
        const raw = readText(path.join(emuDir, name))
        // the 2019 booklet marks answers with percentages ("100% Автоліз")
        if ((raw.match(/^\s*100%\s/gm)?.length ?? 0) > 20) return parsePercentBooklet(normalizeUk(raw))
        return parseBookletText(prepUk(raw)).items.map((it) => ({ n: it.n, text: it.text, options: it.options }))
      },
    })
  }
}

// medical-club.net pages with H5P tests (correct answers marked) in <sources>/html/mc-uk-<year>[suffix].html
const htmlDir = path.join(dir, 'html')
if (fs.existsSync(htmlDir)) {
  const { parseMedicalClub } = require('./parse.cjs')
  for (const name of fs.readdirSync(htmlDir)) {
    const m = name.match(/^mc-uk-(20\d\d)(\w*)\.html$/)
    if (!m) continue
    const year = Number(m[1])
    ukSources.push({
      year,
      prefix: `mu${year}${m[2]}`,
      label: `medical-club ${name}`,
      load() {
        const sets = parseMedicalClub(readText(path.join(htmlDir, name)))
        return sets
          .flatMap((s) => s.items)
          .filter((it) => it.correct >= 0 && it.correct < it.options.length)
          .map((it, k) => ({
            n: k + 1,
            text: normalizeUk(it.text),
            options: [it.options[it.correct], ...it.options.filter((_, i) => i !== it.correct)].map(normalizeUk),
          }))
      },
    })
  }
}

ukSources.sort((a, b) => b.year - a.year || a.prefix.localeCompare(b.prefix))
for (const s of ukSources) addUk(s.year, s.prefix, s.load(), s.label)

/* ---------- write ---------- */

let total = 0
for (const [id, f] of files) {
  if (dirty.has(id)) fs.writeFileSync(path.join(bankDir, `${id}.json`), JSON.stringify(f))
  total += f.questions.length
}
report.push(`changed: ${[...dirty].sort().join(', ')}`)
report.push(`bank after: ${total} questions in ${files.size} collections`)
console.log(report.join('\n'))
