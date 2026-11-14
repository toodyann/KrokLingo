import { useMemo, useState } from 'react'
import { useApp } from '../store/context'
import { shuffle } from '../lib/util'

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
      <div className="page-head">
        <div>
          <h1>Повторення слів</h1>
          <span className="muted">
            Слово стає «вивченим», коли ви {LEARNED_BOX} рази поспіль відповіли «Знаю».
          </span>
        </div>
        <a className="btn btn-ghost btn-sm" href="#/dictionary">
          ← До словника
        </a>
      </div>

      <div className="toolbar">
        <div className="segmented">
          <button type="button" className={direction === 'en-uk' ? 'on' : ''} onClick={() => setDirection('en-uk')}>
            EN → UA
          </button>
          <button type="button" className={direction === 'uk-en' ? 'on' : ''} onClick={() => setDirection('uk-en')}>
            UA → EN
          </button>
        </div>
        <label className="check" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={includeLearned}
            onChange={(e) => {
              setIncludeLearned(e.target.checked)
              setIndex(0)
              setRevealed(false)
            }}
          />
          <span>включити вивчені</span>
        </label>
        <span className="spacer" />
        {deck.length > 0 && (
          <span className="muted small">
            {Math.min(index + 1, deck.length)} / {deck.length}
          </span>
        )}
      </div>

      {deck.length === 0 ? (
        <div className="card empty">
          Немає слів для повторення. Додавайте слова, натискаючи на них у тестах, або увімкніть «включити вивчені».
        </div>
      ) : done ? (
        <div className="card flashcard">
          <h2>Раунд завершено</h2>
          <p className="muted">
            Знаю: {score.known} · Ще повторити: {score.again}
          </p>
          <button type="button" className="btn btn-primary" onClick={restart}>
            Новий раунд
          </button>
        </div>
      ) : (
        entry && (
          <div className="card flashcard">
            <div className="fc-front">{front}</div>
            {revealed ? (
              <>
                <div className="fc-back">{back}</div>
                {entry.note && <div className="fc-note">{entry.note}</div>}
                <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => answer(false)}>
                    Ще повторю
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
                    Знаю
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)} style={{ marginTop: 12 }}>
                Показати переклад
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}
