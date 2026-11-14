// Parsers for Krok 1 booklet sources -> { text, options[], correct } items.
const fs = require('fs')

/** ONMedU/Testing Center text booklets (2007–2018): options on lines starting with "A.", correct answer is A. */
function parseBookletText(raw) {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/\f/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => !/^\s*K\w* ?\d.{0,20}Stomatology/i.test(l) && !/^\s*\d{1,3}\s*$/.test(l))
  const text = ('\n' + lines.join('\n')).replace(/([a-z])-\n([a-z])/g, '$1$2')

  // sequential question numbers at line start
  const starts = []
  let n = 1
  let pos = 0
  for (;;) {
    const re = new RegExp(`\\n\\s*${n}\\.\\s+(?=\\S)`, 'g')
    re.lastIndex = pos
    const m = re.exec(text)
    if (!m) break
    starts.push({ n, at: m.index + 1, body: m.index + m[0].length })
    pos = m.index + m[0].length
    n++
  }
  const items = []
  const problems = []
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]
    let chunk = text.slice(s.body, i + 1 < starts.length ? starts[i + 1].at : undefined)
    const aAt = chunk.lastIndexOf('\nA. ')
    if (aAt < 0) {
      problems.push({ n: s.n, why: 'no A line' })
      continue
    }
    const stem = clean(chunk.slice(0, aAt))
    let opts = chunk.slice(aAt + 1)
    if (i + 1 === starts.length) opts = opts.split(/\n\s*\n/)[0] // last question: drop trailing glossary
    opts = ' ' + opts.replace(/\s+/g, ' ').trim()
    const marks = []
    let p = 0
    for (const L of ['A', 'B', 'C', 'D', 'E']) {
      const idx = opts.indexOf(` ${L}. `, p)
      if (idx < 0) break
      marks.push(idx)
      p = idx + 3
    }
    if (marks.length < 4) {
      problems.push({ n: s.n, why: `only ${marks.length} options` })
      continue
    }
    const options = marks
      .map((m, k) => clean(opts.slice(m + 4, k + 1 < marks.length ? marks[k + 1] : undefined)))
      .filter((o) => o && o !== '-' && o !== '–')
    if (!stem || options.length < 3) {
      problems.push({ n: s.n, why: 'empty' })
      continue
    }
    items.push({ n: s.n, text: stem, options, correct: 0 })
  }
  return { items, problems, found: starts.length }
}

function clean(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .trim()
}

/** Saved medical-club page: returns H5P sets with passages that precede them on the page. */
function parseMedicalClub(html) {
  const m = html.match(/H5PIntegration = (\{.*?\});\s*<\/script>/s)
  if (!m) return []
  const contents = JSON.parse(m[1]).contents
  const pageText = htmlToText(html)
  const sets = []
  for (const key in contents) {
    const id = key.replace('cid-', '')
    const j = JSON.parse(contents[key].jsonContent)
    const items = []
    if (j.questions) {
      for (const q of j.questions) {
        if (!q.library.startsWith('H5P.MultiChoice')) continue
        const answers = q.params.answers.map((a) => ({ t: htmlToText(a.text).trim(), c: !!a.correct }))
        if (answers.filter((a) => a.c).length !== 1 || answers.some((a) => !a.t)) continue
        items.push({ text: clean(htmlToText(q.params.question)), options: answers.map((a) => clean(a.t)), correct: answers.findIndex((a) => a.c) })
      }
    } else if (j.choices) {
      // H5P.SingleChoiceSet: the first answer is the correct one
      for (const c of j.choices) {
        const options = c.answers.map((a) => clean(htmlToText(typeof a === 'string' ? a : a?.text)))
        if (options.some((o) => !o)) continue
        if (options.length < 2) continue
        items.push(recoverLeakedAnswer(clean(htmlToText(c.question)), options))
      }
    }
    // passage = text between previous H5P marker (or page title) and this one
    const marker = `[[H5P ${id}]]`
    const end = pageText.indexOf(marker)
    let passage = null
    if (end > 0) {
      const before = pageText.slice(0, end)
      const prev = before.lastIndexOf('[[H5P ')
      const startAt = prev >= 0 ? before.indexOf(']]', prev) + 2 : before.indexOf('КРОК 1')
      const block = before
        .slice(startAt)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (prev < 0) block.shift() // page title line
      if (block.length >= 2 && block.join(' ').length > 300) passage = { title: block[0], paragraphs: block.slice(1) }
    }
    sets.push({ id, title: contents[key].title, items, passage })
  }
  return sets
}

/**
 * Some SingleChoiceSet items have the correct statement appended to the question text and only the
 * distractors left as answers. When the tail of the question reads like one of the options, it is the answer.
 */
function recoverLeakedAnswer(text, options) {
  const words = (s) => new Set(s.toLowerCase().match(/[a-z]+/g) || [])
  const jaccard = (a, b) => {
    const A = words(a), B = words(b)
    const inter = [...A].filter((w) => B.has(w)).length
    return inter / (A.size + B.size - inter || 1)
  }
  let best = null
  for (const m of text.matchAll(/(?<=\S\s)[A-Z]/g)) {
    if (m.index < 15) continue
    const tail = text.slice(m.index).trim()
    if (tail.split(/\s+/).length < 3) continue
    const score = Math.max(...options.map((o) => jaccard(tail, o)))
    if (!best || score > best.score) best = { at: m.index, tail, score }
  }
  if (best && best.score >= 0.4 && !options.includes(best.tail)) {
    const stem = text.slice(0, best.at).trim()
    return { text: /[.?:]$/.test(stem) ? stem : stem + '?', options: [best.tail, ...options], correct: 0, recovered: true }
  }
  return { text, options, correct: 0 }
}

function htmlToText(h = '') {
  const body = h.includes('<body') ? h.slice(h.indexOf('<body')) : h
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<iframe[^>]*data-content-id="(\d+)"[^>]*>/g, '\n[[H5P $1]]\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/(p|h\d|li|div)>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&#039;|&#39;|&rsquo;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8220;|&#8221;|&quot;|&laquo;|&raquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
}

module.exports = { parseBookletText, parseMedicalClub, clean, readText: (f) => fs.readFileSync(f, 'utf8') }
