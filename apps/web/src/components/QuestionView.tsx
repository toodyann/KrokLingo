import { LETTERS } from '../lib/util'
import { useApp } from '../store/context'
import type { Question } from '../types'
import { ClickableText } from './ClickableText'

interface TextProps {
  as?: 'span' | 'div'
  className?: string
  text: string
  contextId: string
  related?: string
  /** Word lookup translates English; Ukrainian questions are plain text. */
  clickable: boolean
}

function Text({ as = 'span', className, text, contextId, related, clickable }: TextProps) {
  if (clickable) return <ClickableText as={as} className={className} text={text} contextId={contextId} related={related} />
  return as === 'div' ? <div className={className}>{text}</div> : <span className={className}>{text}</span>
}

interface Props {
  question: Question
  /** Display order: order[displayIndex] = original option index. */
  order: number[]
  /** Chosen original option index. */
  chosen: number | null
  /** Show correct/wrong marks and the explanation. */
  reveal: boolean
  onChoose?: (originalIndex: number) => void
  passageOpen?: boolean
}

export function QuestionView({ question, order, chosen, reveal, onChoose, passageOpen = true }: Props) {
  const { bank } = useApp()
  const passage = question.passageId ? bank.passageById.get(question.passageId) : undefined
  const locked = !onChoose
  const clickable = bank.langOf(question) === 'en'

  return (
    <div>
      {passage && (
        <details className="passage" open={passageOpen}>
          <summary>Текст для читання: {passage.title}</summary>
          <Text clickable={clickable} as="div" text={passage.text} contextId={`passage:${passage.id}`} />
        </details>
      )}

      <Text clickable={clickable} as="div" className="question-text" text={question.text} contextId={question.id} />

      <div className="options" role="radiogroup">
        {order.map((original, displayIndex) => {
          const isChosen = chosen === original
          const isCorrect = original === question.correct
          let cls = 'option'
          if (reveal && isCorrect) cls += ' correct'
          else if (reveal && isChosen) cls += ' wrong'
          else if (isChosen) cls += ' selected'
          if (locked) cls += ' locked'
          const select = () => onChoose?.(original)
          return (
            <div key={original} className={cls} onClick={select} role="radio" aria-checked={isChosen}>
              <button
                type="button"
                className="option-letter"
                onClick={(e) => {
                  e.stopPropagation()
                  select()
                }}
                disabled={locked}
                aria-label={`Варіант ${LETTERS[displayIndex]}`}
              >
                {LETTERS[displayIndex]}
              </button>
              <Text
                clickable={clickable}
                className="option-text"
                text={question.options[original]}
                contextId={question.id}
                related={question.text}
              />
              {reveal && isCorrect && <span className="mark">✓ правильна</span>}
              {reveal && isChosen && !isCorrect && <span className="mark">✗ ваша відповідь</span>}
            </div>
          )
        })}
      </div>

      {reveal && question.explanation && (
        <div className="explanation">
          <b>Пояснення: </b>
          <Text clickable={clickable} text={question.explanation} contextId={question.id} related={question.text} />
        </div>
      )}
    </div>
  )
}
