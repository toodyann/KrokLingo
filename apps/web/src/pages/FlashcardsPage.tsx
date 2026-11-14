import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '../components/EmptyState'
import { IconBook } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { shuffle } from '../lib/util'
import { useApp } from '../store/context'
import { link } from '../lib/router'

type Direction = 'en-uk' | 'uk-en'

const DIRECTIONS: [Direction, string][] = [
  ['en-uk', 'Англійська → українська'],
  ['uk-en', 'Українська → англійська'],
]

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
    <div className="page flashcards-page">
      <PageHeader back={{ href: link('dictionary'), label: 'Словник' }} title="Картки" />

      <div className="toolbar">
        <Segmented value={direction} onChange={setDirection} options={DIRECTIONS} label="Напрям" />
        <span className="spacer" />
        {deck.length > 0 && !done && (
          <span className="text-sm text-muted-foreground tnum">
            {index + 1} / {deck.length}
          </span>
        )}
      </div>

      {deck.length === 0 ? (
        <EmptyState
          icon={<IconBook />}
          title="Немає слів для повторення"
          actions={
            <Button asChild variant="outline">
              <a href={link('dictionary')}>До словника</a>
            </Button>
          }
        />
      ) : done ? (
        <Card className="flashcard">
          <h2 className="t-section">Раунд завершено</h2>
          <p className="text-muted-foreground">
            Знаю: {score.known} · Ще повторити: {score.again}
          </p>
          <Button size="lg" onClick={restart}>
            Новий раунд
          </Button>
        </Card>
      ) : (
        entry && (
          <Card className="flashcard" aria-live="polite">
            <div className="fc-front">{front}</div>
            {revealed ? (
              <>
                <div className="fc-back">{back}</div>
                {entry.note && <div className="fc-note">{entry.note}</div>}
                <div className="mt-4 flex justify-center gap-2">
                  <Button size="lg" variant="outline" onClick={() => answer(false)}>
                    Ще повторю
                  </Button>
                  <Button size="lg" onClick={() => answer(true)}>
                    Знаю
                  </Button>
                </div>
              </>
            ) : (
              <Button size="lg" variant="secondary" className="mt-4" onClick={() => setRevealed(true)}>
                Показати переклад
              </Button>
            )}
          </Card>
        )
      )}

      <Card className="mt-5">
        <CardContent className="flex items-center justify-between gap-4">
          <Label htmlFor="include-learned">Включати вивчені слова</Label>
          <Switch
            id="include-learned"
            checked={includeLearned}
            onCheckedChange={(v) => {
              setIncludeLearned(v)
              setIndex(0)
              setRevealed(false)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
