import type { DictEntry } from '../types'
import { downloadFile, pluralUk } from './util'
import { createZip } from './zip'

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateUk(ts: number): string {
  return new Date(ts).toLocaleDateString('uk-UA')
}

export function exportTxt(entries: DictEntry[]): void {
  const lines = [
    'Словник невідомих слів — KrokLingo',
    `Експортовано: ${new Date().toLocaleString('uk-UA')}`,
    `Кількість слів: ${entries.length}`,
    '',
  ]
  for (const e of entries) {
    lines.push(`${e.word} — ${e.translation || '(без перекладу)'}${e.learned ? '  [вивчено]' : ''}`)
    if (e.note) lines.push(`    Примітка: ${e.note.replace(/\n/g, ' ')}`)
  }
  // BOM so that Windows Notepad detects UTF-8
  downloadFile(`kroklingo-slovnyk-${stamp()}.txt`, '﻿' + lines.join('\r\n'), 'text/plain;charset=utf-8')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function run(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): string {
  const props = [
    opts.bold ? '<w:b/>' : '',
    opts.color ? `<w:color w:val="${opts.color}"/>` : '',
    opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '',
  ].join('')
  const parts = text.split('\n')
  return parts
    .map(
      (p, i) =>
        `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${i > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(p)}</w:t></w:r>`,
    )
    .join('')
}

function para(content: string, opts: { spacingAfter?: number } = {}): string {
  return `<w:p><w:pPr><w:spacing w:after="${opts.spacingAfter ?? 80}"/></w:pPr>${content}</w:p>`
}

function cell(content: string, width: number, header = false): string {
  const shading = header ? '<w:shd w:val="clear" w:color="auto" w:fill="E0F2EF"/>' : ''
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shading}</w:tcPr>${para(content, { spacingAfter: 0 })}</w:tc>`
}

export function buildDocx(entries: DictEntry[]): Uint8Array<ArrayBuffer> {
  const widths = [2400, 3400, 2600, 1200]
  const header = ['Слово', 'Переклад', 'Примітка', 'Додано']
  const rows = [
    `<w:tr><w:trPr><w:tblHeader/></w:trPr>${header.map((h, i) => cell(run(h, { bold: true }), widths[i], true)).join('')}</w:tr>`,
    ...entries.map(
      (e) =>
        `<w:tr>${[
          cell(run(e.word, { bold: true }) + (e.learned ? run('  ✓', { color: '15803D' }) : ''), widths[0]),
          cell(run(e.translation || '—'), widths[1]),
          cell(run(e.note || ''), widths[2]),
          cell(run(dateUk(e.addedAt), { size: 18, color: '6D6A76' }), widths[3]),
        ].join('')}</w:tr>`,
    ),
  ]

  const border = '<w:{s} w:val="single" w:sz="4" w:space="0" w:color="D9D7CF"/>'
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => border.replace('{s}', s)).join('')

  const body = [
    para(run('Словник невідомих слів', { bold: true, size: 36 }), { spacingAfter: 60 }),
    para(
      run(
        `KrokLingo · ${new Date().toLocaleDateString('uk-UA')} · ${entries.length} ${pluralUk(entries.length, 'слово', 'слова', 'слів')}`,
        {
          size: 20,
          color: '6D6A76',
        },
      ),
      { spacingAfter: 240 },
    ),
    `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`,
    '<w:p/>',
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>',
  ].join('')

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="uk-UA"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

  return createZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/_rels/document.xml.rels', data: docRels },
  ])
}

export function exportDocx(entries: DictEntry[]): void {
  downloadFile(
    `kroklingo-slovnyk-${stamp()}.docx`,
    buildDocx(entries),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
}
