import { memo, type MouseEvent } from 'react'
import { useWordLookup } from './wordLookupContext'

const TOKEN_RE = /([A-Za-z]+(?:['’-][A-Za-z]+)*)/g

interface Props {
  text: string
  className?: string
  as?: 'span' | 'p' | 'div'
}

/** Renders English text with every word clickable for instant translation. */
export const ClickableText = memo(function ClickableText({ text, className, as = 'span' }: Props) {
  const lookup = useWordLookup()
  const parts = text.split(TOKEN_RE)

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
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="w" data-w={part}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </Tag>
  )
})
