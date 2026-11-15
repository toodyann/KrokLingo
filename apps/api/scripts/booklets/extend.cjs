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

/* ---------- write ---------- */

let total = 0
for (const [id, f] of files) {
  if (dirty.has(id)) fs.writeFileSync(path.join(bankDir, `${id}.json`), JSON.stringify(f))
  total += f.questions.length
}
report.push(`changed: ${[...dirty].sort().join(', ')}`)
report.push(`bank after: ${total} questions in ${files.size} collections`)
console.log(report.join('\n'))
