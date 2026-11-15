import { describe, expect, it } from 'vitest'
import { createZip } from './zip'

// A tiny reader for what createZip writes (STORE only): walks the central directory.
function readZip(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - 22
  expect(v.getUint32(end, true)).toBe(0x06054b50)
  const count = v.getUint16(end + 10, true)
  let pos = v.getUint32(end + 16, true)
  const dec = new TextDecoder()
  const files: { name: string; text: string; crc: number }[] = []
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(pos, true)).toBe(0x02014b50)
    const crc = v.getUint32(pos + 16, true)
    const size = v.getUint32(pos + 20, true)
    const nameLen = v.getUint16(pos + 28, true)
    const offset = v.getUint32(pos + 42, true)
    const name = dec.decode(bytes.subarray(pos + 46, pos + 46 + nameLen))
    expect(v.getUint32(offset, true)).toBe(0x04034b50)
    const dataStart = offset + 30 + v.getUint16(offset + 26, true)
    files.push({ name, crc, text: dec.decode(bytes.subarray(dataStart, dataStart + size)) })
    pos += 46 + nameLen
  }
  return files
}

describe('createZip', () => {
  it('stores each file under its UTF-8 name', () => {
    const zip = createZip([
      { name: '[Content_Types].xml', data: '<Types/>' },
      { name: 'word/словник.xml', data: new TextEncoder().encode('Емаль — enamel') },
    ])
    expect(readZip(zip).map(({ name, text }) => ({ name, text }))).toEqual([
      { name: '[Content_Types].xml', text: '<Types/>' },
      { name: 'word/словник.xml', text: 'Емаль — enamel' },
    ])
  })

  it('writes the standard CRC-32', () => {
    // CRC-32 of "123456789" is the published check value 0xCBF43926
    expect(readZip(createZip([{ name: 'a.txt', data: '123456789' }]))[0].crc).toBe(0xcbf43926)
  })

  it('makes a valid empty archive', () => {
    expect(readZip(createZip([]))).toEqual([])
  })
})
