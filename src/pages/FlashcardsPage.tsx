import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { shuffle } from '../lib/util'
import { useApp } from '../store/context'

type Direction = 'en-uk' | 'uk-en'

/** Box at which a word is considered learned. */
const LEARNED_BOX = 3

export function FlashcardsPage() {
  const { dictionary, updateEntry } = useApp()
  const [direction, setDirection] = useState<Direction>('en-uk')
  const [includeLearned, setIncludeLearned] = useState(false)
  const [round, setRound] = useState(0)

  // The deck is fixed for a round: lowest boxes first, shuffled within a box.
  const deck = useMemo(() => {
    const pool = dictionary.filter((e) => e.translation && (includeLearned || !e.learned))
    const byBox = new Map<number, typeof pool>()
    for (const e of pool) byBox.set(e.box, [...(byBox.get(e.box) ?? []), e])
    return [...byBox.keys()].sort((a, b) => a - b).flatMap((box) => shuffle(byBox.get(box)!)).map((e) => e.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, includeLearned])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ known: 0, again: 0 })

  const entry = dictionary.find((e) => e.id === deck[index])
  const done = index >= deck.length

  const restart = () => {
    setRound((r) => r + 1)
    setIndex(0)
    setRevealed(false)
    setScore({ known: 0, again: 0 })
  }

  const answer = (known: boolean) => {
    if (!entry) return
    const box = known ? entry.box + 1 : 0
    updateEntry(entry.id, { box, learned: known ? box >= LEARNED_BOX || entry.learned : false })
    setScore((s) => (known ? { ...s, known: s.known + 1 } : { ...s, again: s.again + 1 }))
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  const front = entry ? (direction === 'en-uk' ? entry.word : entry.translation) : ''
  const back = entry ? (direction === 'en-uk' ? entry.translation : entry.word) : ''

  return (
    <div className="page page-narrow">
      <PageHeader
        back={{ href: '#/dictionary', label: 'Словник' }}
        title="Картки"
      />

      <div className="toolbar">
        <div className="segmented" role="radiogroup" aria-label="Напрям">
          <button type="button" role="radio" aria-checked={direction === 'en-uk'} onClick={() => setDirection('en-uk')}>
            Англійська → українська
          </button>
          <button type="button" role="radio" aria-checked={direction === 'uk-en'} onClick={() => setDirection('uk-en')}>
            Українська → англійська
          </button>
        </div>
        <span className="spacer" />
        {deck.length > 0 && !done && (
          <span className="secondary tnum">
            {index + 1} / {deck.length}
          </span>
        )}
      </div>

      {deck.length === 0 ? (
        <div className="card empty">
          <h2 className="t-title3">Немає слів для повторення</h2>
        </div>
      ) : done ? (
        <div className="card flashcard">
          <h2 className="t-title2">Раунд завершено</h2>
          <p className="secondary">
            Знаю: {score.known} · Ще повторити: {score.again}
          </p>
          <button type="button" className="btn btn-primary" onClick={restart}>
            Новий раунд
          </button>
        </div>
      ) : (
        entry && (
          <div className="card flashcard" aria-live="polite">
            <div className="fc-front">{front}</div>
            {revealed ? (
              <>
                <div className="fc-back">{back}</div>
                {entry.note && <div className="fc-note">{entry.note}</div>}
                <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
                  <button type="button" className="btn btn-gray" onClick={() => answer(false)}>
                    Ще повторю
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
                    Знаю
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-tinted" onClick={() => setRevealed(true)} style={{ marginTop: 16 }}>
                Показати переклад
              </button>
            )}
          </div>
        )
      )}

      <div className="list" style={{ marginTop: 20 }}>
        <label className="list-row" style={{ cursor: 'pointer' }}>
          <div className="list-row-main">Включати вивчені слова</div>
          <input
            type="checkbox"
            className="switch"
            checked={includeLearned}
            onChange={(e) => {
              setIncludeLearned(e.target.checked)
              setIndex(0)
              setRevealed(false)
            }}
          />
        </label>
      </div>
    </div>
  )
}
