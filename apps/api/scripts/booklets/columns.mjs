// Usage: node scripts/booklets/columns.mjs <booklet.pdf> <out.txt>   (needs: npm i --no-save mupdf)
// Line-level column reconstruction: lines starting right of the gutter go to the right column.
import * as mupdf from 'mupdf'
import fs from 'node:fs'
import path from 'node:path'
const [file, out] = process.argv.slice(2)
const doc = mupdf.Document.openDocument(fs.readFileSync(file), 'application/pdf')
let text = ''
let twoCol = 0
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i)
  const [, , W] = page.getBounds()
  const st = JSON.parse(page.toStructuredText('preserve-whitespace').asJSON())
  const mid = W / 2
  const lines = []
  for (const b of st.blocks) {
    if (b.type !== 'text') continue
    for (const l of b.lines) lines.push({ x0: l.bbox.x, x1: l.bbox.x + l.bbox.w, y: l.bbox.y, h: l.bbox.h, t: l.text })
  }
  const rightStarts = lines.filter((l) => l.x0 > mid - 10).length
  const spanning = lines.filter((l) => l.x0 < mid - 10 && l.x1 > mid + 10).length
  const isTwo = rightStarts > 10 && spanning < lines.length * 0.25
  let ordered
  if (isTwo) {
    twoCol++
    const byY = (a, b) => a.y - b.y || a.x0 - b.x0
    const left = lines.filter((l) => l.x0 <= mid - 10).sort(byY)
    const right = lines.filter((l) => l.x0 > mid - 10).sort(byY)
    ordered = [...left, ...right]
  } else {
    ordered = lines.sort((a, b) => a.y - b.y || a.x0 - b.x0)
  }
  // merge fragments that share a baseline (mupdf may split one visual line)
  const merged = []
  for (const l of ordered) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      Math.abs(prev.y - l.y) < 2 &&
      l.x0 >= prev.x1 - 2 &&
      (isTwo ? prev.x0 > mid - 10 === l.x0 > mid - 10 : true)
    ) {
      prev.t += (l.x0 - prev.x1 > 1.5 ? ' ' : '') + l.t
      prev.x1 = l.x1
    } else merged.push({ ...l })
  }
  text += merged.map((l) => l.t).join('\n') + '\n\f\n'
}
fs.writeFileSync(out, text)
console.log(path.basename(file), 'pages', doc.countPages(), 'twoCol', twoCol)
