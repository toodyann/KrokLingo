// Builds src/data/booklets/*.json (one file per collection) from the downloaded booklet sources.
// Usage: node scripts/booklets/build.cjs <sources dir> src/data/booklets
const fs = require('fs')
const path = require('path')
const { parseBookletText, parseMedicalClub, readText } = require('./parse.cjs')
const { scores, argmax, segment } = require('./classify.cjs')

const [dir, outFile] = process.argv.slice(2)
const YEARS = [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018]
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const report = []

const collections = []
const passages = []
const questions = [] // { id, topic, collection, text, options (correct first), passageId? }

/** Topics for a booklet: subject-ordered head (segmented) + mixed tail (per-question). */
function bookletTopics(items) {
  const raw = items.map((i) => argmax(scores(i)))
  // the ordered head ends after the first pharmacology run (>=3 in a window of 5) in the first 130 items
  let headEnd = items.length
  for (let i = 10; i < Math.min(items.length, 130); i++) {
    const win = raw.slice(i, i + 5).filter((t) => t === 'pharmacology').length
    if (raw[i] === 'pharmacology' && win >= 3) {
      let j = i
      while (j < items.length && raw.slice(j, j + 4).includes('pharmacology')) j++
      headEnd = j
      break
    }
  }
  const head = segment(items.slice(0, headEnd))
  const tail = items.slice(headEnd).map((it, k) => {
    const s = scores(it)
    const best = argmax(s)
    return s[best] > 0 ? best : raw[headEnd + k]
  })
  return { topics: [...head, ...tail], headEnd }
}

// ---- 1. Official booklets 2007–2018 (ONMedU mirror of the Testing Center booklets) ----
for (const y of YEARS) {
  const raw = parseBookletText(readText(path.join(dir, `txt/onmedu-${y}.raw.txt`)))
  const cols = parseBookletText(readText(path.join(dir, `txt/onmedu-${y}.cols.txt`)))
  const rawOk = raw.found === 200
  const primary = new Map((rawOk ? raw : cols).items.map((i) => [i.n, i]))
  const secondary = new Map((rawOk ? cols : raw).items.map((i) => [i.n, i]))
  const items = []
  for (let n = 1; n <= 200; n++) {
    // raw text is only trusted when its numbering ran through all 200 items
    const it = primary.get(n) ?? (rawOk ? secondary.get(n) : undefined)
    if (it) items.push(it)
  }
  const { topics, headEnd } = bookletTopics(items)
  const cid = `krok-${y}`
  collections.push({ id: cid, name: `Буклет ${y}`, description: `Крок 1. Стоматологія, буклет ${y} року` })
  items.forEach((it, k) =>
    questions.push({ id: `k${y}-${it.n}`, topic: topics[k], collection: cid, text: it.text, options: it.options, src: 'booklet' }),
  )
  report.push(`${y}: ${items.length} items (source ${rawOk ? 'raw' : 'cols'}), ordered head ${headEnd}`)
}

// ---- 2. medical-club.net H5P sets (2018 English subtest, 2020 English, 2022–2024 professional English) ----
const latin = (s) => {
  const letters = s.match(/\p{L}/gu) || []
  return letters.length ? letters.filter((c) => /[A-Za-z]/.test(c)).length / letters.length : 0
}
const MC = [
  { file: 'mc-2018-sub', year: 2018, cid: 'krok-2018', note: 'English subtest' },
  { file: 'mc-2020', year: 2020, cid: 'krok-2020', name: 'Буклет 2020', description: 'Крок 1. Стоматологія, англомовний варіант 2020 року (вибірка)' },
  { file: 'mc-2022-eng', year: 2022, cid: 'english-2022', name: 'Англійська 2022', description: 'Іспит з англійської мови професійного спрямування, 2022' },
  { file: 'mc-2023-eng', year: 2023, cid: 'english-2023', name: 'Англійська 2023', description: 'Іспит з англійської мови професійного спрямування, 2023' },
  { file: 'mc-2024-eng', year: 2024, cid: 'english-2024', name: 'Англійська 2024', description: 'Іспит з англійської мови професійного спрямування, 2024' },
]
// document frequency over booklet stems: words common in medical questions are not passage-specific
const df = new Map()
for (const q of questions) for (const w of new Set(q.text.toLowerCase().match(/[a-z]{5,}/g) || [])) df.set(w, (df.get(w) || 0) + 1)
const PASSAGE_TITLE_FIX = { 3099: 'Pandemics' } // the page repeats the previous heading for this set

for (const src of MC) {
  const sets = parseMedicalClub(readText(path.join(dir, `html/${src.file}.html`)))
  if (src.name && !collections.some((c) => c.id === src.cid)) collections.push({ id: src.cid, name: src.name, description: src.description })
  let added = 0
  for (const set of sets) {
    let passageId
    let words
    if (set.passage) {
      passageId = `p-${src.year}-${set.id}`
      const title = PASSAGE_TITLE_FIX[set.id] ?? set.passage.title
      passages.push({ id: passageId, title, text: set.passage.paragraphs.join('\n\n') })
      words = new Set(set.passage.paragraphs.join(' ').toLowerCase().match(/[a-z]{5,}/g) || [])
    }
    set.items.forEach((it, k) => {
      if (latin(it.text + it.options.join(' ')) < 0.9) return // Ukrainian part of the 2018 page
      if (it.options.length > 5 || it.options.some((o) => o.length > 400)) return // malformed source item
      // some items repeat the answer options inside the question text
      const firstOpt = it.options.map((o) => it.text.indexOf(o)).filter((i) => i > 10)
      if (firstOpt.length) it.text = it.text.slice(0, Math.min(...firstOpt)).trim()
      const options = [it.options[it.correct], ...it.options.filter((_, i) => i !== it.correct)]
      let topic
      let pid
      if (passageId) {
        const qWords = new Set((it.text + ' ' + it.options.join(' ')).toLowerCase().match(/[a-z]{5,}/g) || [])
        const specific = [...qWords].filter((w) => words.has(w) && (df.get(w) || 0) < 15).length
        const statement = options.length <= 3 || /^choose the correct statement/i.test(it.text)
        const clinical = it.text.length > 220 || /^(an?|the)\s+(\d+[- ]|patient|man|woman|child|girl|boy|newborn|previously|liquidator)/i.test(it.text)
        if (statement || (!clinical && specific >= 3)) {
          topic = 'reading'
          pid = passageId
        }
      }
      if (!topic) {
        const s = scores({ text: it.text, options })
        topic = s[argmax(s)] > 0 ? argmax(s) : 'pathology'
      }
      questions.push({ id: `mc${src.year}-${set.id}-${k + 1}`, topic, collection: src.cid, text: it.text, options, passageId: pid, src: 'mc' })
      added++
    })
  }
  report.push(`${src.file}: ${added} English items from ${sets.length} set(s)${sets.some((s) => s.passage) ? ', passages ' + sets.filter((s) => s.passage).length : ''}`)
}

// ---- 3. Drop items damaged by extraction, then deduplicate (same stem + same answer -> newest copy) ----
// ABO groups are printed with symbol glyphs that the PDFs lose: "(II)" instead of "A(II)"
const lostGlyph = /(^|[^A-Za-z0-9])\((I{1,3}|IV)\)/
const damaged = questions.filter((q) => lostGlyph.test(q.text) || q.options.some((o) => lostGlyph.test(o)))
report.push(`dropped ${damaged.length} items with lost blood-group glyphs`)
const kept = questions.filter((q) => !damaged.includes(q))
const byKey = new Map()
for (const q of kept) {
  const key = norm(q.text) + '|' + norm(q.options[0])
  const prev = byKey.get(key)
  if (!prev || prev.collection.localeCompare(q.collection, 'en', { numeric: true }) < 0 || (q.passageId && !prev.passageId)) byKey.set(key, q)
}
const unique = [...byKey.values()]
// keep collections that still have questions
const used = new Set(unique.map((q) => q.collection))
const outCollections = collections.filter((c) => used.has(c.id)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
const usedPassages = new Set(unique.map((q) => q.passageId).filter(Boolean))

const topicCount = {}
for (const q of unique) topicCount[q.topic] = (topicCount[q.topic] || 0) + 1
const perCollection = {}
for (const q of unique) perCollection[q.collection] = (perCollection[q.collection] || 0) + 1

// one file per collection, so the app can fetch them in parallel as small chunks
fs.rmSync(outFile, { recursive: true, force: true })
fs.mkdirSync(outFile, { recursive: true })
let bytes = 0
for (const c of outCollections) {
  const qs = unique.filter((q) => q.collection === c.id)
  const pids = new Set(qs.map((q) => q.passageId).filter(Boolean))
  const out = {
    collection: c,
    passages: passages.filter((p) => pids.has(p.id) && usedPassages.has(p.id)),
    // compact rows: [id, topic, text, options (correct first), passageId?]
    questions: qs.map((q) => (q.passageId ? [q.id, q.topic, q.text, q.options, q.passageId] : [q.id, q.topic, q.text, q.options])),
  }
  const file = path.join(outFile, `${c.id}.json`)
  fs.writeFileSync(file, JSON.stringify(out))
  bytes += fs.statSync(file).size
}
const out = { passages: passages.filter((p) => usedPassages.has(p.id)) }
report.push(`total parsed ${questions.length}, unique ${unique.length}, passages ${out.passages.length}`)
report.push('topics ' + JSON.stringify(topicCount))
report.push('collections ' + JSON.stringify(perCollection))
report.push('bytes ' + bytes)
console.log(report.join('\n'))

