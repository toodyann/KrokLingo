import { GLOSSARY } from '../data/glossary'
import { lemmaCandidates, normalizeWord } from './lemmatize'

export interface BuiltinHit {
  lemma: string
  translation: string
}

/** Looks a word up in the built-in glossary, trying inflected forms and hyphen parts. */
export function lookupBuiltin(raw: string): BuiltinHit | null {
  for (const c of lemmaCandidates(raw)) {
    const t = GLOSSARY.get(c)
    if (t) return { lemma: c, translation: t }
  }
  const word = normalizeWord(raw)
  if (word.includes('-')) {
    const parts = word.split('-').filter(Boolean)
    const translated = parts.map((p) => lookupBuiltin(p)?.translation.split(/[;,]/)[0].trim())
    if (translated.every(Boolean)) {
      return { lemma: word, translation: translated.join(' + ') }
    }
  }
  return null
}

/** All forms under which a word could already be stored in the user's dictionary. */
export function storageKeys(raw: string): string[] {
  return lemmaCandidates(raw)
}

/** Online fallback (MyMemory public API) for words missing from the glossary. */
export async function lookupOnline(word: string, signal?: AbortSignal): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|uk`
  const timeout = AbortSignal.timeout(6000)
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!res.ok) return null
  const data = (await res.json()) as {
    responseStatus?: number | string
    responseData?: { translatedText?: string }
  }
  const text = data.responseData?.translatedText?.trim()
  if (!text || Number(data.responseStatus) !== 200) return null
  if (/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(text)) return null
  if (text.toLowerCase() === word.toLowerCase()) return null
  return text
}
