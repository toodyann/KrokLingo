import { memo, useMemo, type MouseEvent } from 'react'
import { lemmaCandidates } from '../lib/lemmatize'
import { useKnownWords, useWordLookup } from './wordLookupContext'

const TOKEN_RE = /([A-Za-z]+(?:['’-][A-Za-z]+)*)/g

interface Props {
  text: string
  className?: string
  as?: 'span' | 'p' | 'div'
}

/**
 * Renders English text with every word clickable for instant translation.
 * Words already in the dictionary carry the highlighter marker.
 */
export const ClickableText = memo(function ClickableText({ text, className, as = 'span' }: Props) {
  const lookup = useWordLookup()
  const { known, justAdded } = useKnownWords()

  const parts = useMemo(() => {
    return text.split(TOKEN_RE).map((part, i) => {
      if (i % 2 === 0) return { part, word: false as const }
      const keys = lemmaCandidates(part)
      const hit = keys.find((k) => known.has(k))
      return { part, word: true as const, known: !!hit, fresh: !!hit && hit === justAdded }
    })
  }, [text, known, justAdded])

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    const word = target.dataset?.w
    if (!word) return
    e.stopPropagation()
    e.preventDefault()
    lookup(word, target)
  }

  const Tag = as
  return (
    <Tag className={className ? `ctext ${className}` : 'ctext'} onClick={onClick}>
      {parts.map((p, i) =>
        p.word ? (
          <span
            key={i}
            className={`w${p.known ? ' known' : ''}${p.fresh ? ' just-added' : ''}`}
            data-w={p.part}
          >
            {p.part}
          </span>
        ) : (
          p.part
        ),
      )}
    </Tag>
  )
})
