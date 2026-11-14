import { memo, useMemo, type MouseEvent, type ReactNode } from 'react'
import { lemmaCandidates } from '../lib/lemmatize'
import { analyzeText } from '../lib/text'
import { knownPhraseTokens } from '../lib/translate'
import { useKnownWords, useWordLookup } from './wordLookupContext'

interface Props {
  text: string
  className?: string
  as?: 'span' | 'p' | 'div'
  /** Question or passage id: lets the translator use translations verified for this text. */
  contextId?: string
  /** Extra context for short texts (the question stem for an answer option). */
  related?: string
}

/**
 * Renders English text with every word clickable for instant translation. A click passes the whole
 * text and the token position, so the translator sees the sentence, the neighbours and the question.
 * Words (and saved phrases) already in the dictionary carry the highlighter marker.
 */
export const ClickableText = memo(function ClickableText({ text, className, as = 'span', contextId, related }: Props) {
  const lookup = useWordLookup()
  const { known, justAdded } = useKnownWords()

  const parts = useMemo(() => {
    const { tokens } = analyzeText(text)
    const hasPhrases = [...known].some((k) => k.includes(' '))
    const inPhrase = hasPhrases ? knownPhraseTokens(text, (k) => known.has(k)) : new Set<number>()
    const out: ReactNode[] = []
    let pos = 0
    tokens.forEach((t, i) => {
      if (t.start > pos) out.push(text.slice(pos, t.start))
      const hit = lemmaCandidates(t.text).find((k) => known.has(k))
      const isKnown = !!hit || inPhrase.has(i)
      const fresh = !!hit && hit === justAdded
      out.push(
        <span key={i} className={`w${isKnown ? ' known' : ''}${fresh ? ' just-added' : ''}`} data-i={i}>
          {t.text}
        </span>,
      )
      pos = t.end
    })
    if (pos < text.length) out.push(text.slice(pos))
    return out
  }, [text, known, justAdded])

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    const index = target.dataset?.i
    if (index === undefined) return
    e.stopPropagation()
    e.preventDefault()
    lookup({ text, index: Number(index), contextId, related }, target)
  }

  const Tag = as
  return (
    <Tag className={className ? `ctext ${className}` : 'ctext'} onClick={onClick}>
      {parts}
    </Tag>
  )
})
