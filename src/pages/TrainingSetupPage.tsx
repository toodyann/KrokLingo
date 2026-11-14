import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { createSession, mistakeIds } from '../lib/session'
import { shuffle } from '../lib/util'
import { useApp } from '../store/context'

const COUNTS = [10, 20, 30, 50, 0] as const

export function TrainingSetupPage() {
  const { bank, settings, history, session, setSession } = useApp()
  const [collections, setCollections] = useState<string[]>(() => bank.collections.map((c) => c.id))
  const [topics, setTopics] = useState<string[]>(() => bank.topics.map((t) => t.id))
  const [count, setCount] = useState<number>(20)
  const [onlyMistakes, setOnlyMistakes] = useState(false)
  const [instantFeedback, setInstantFeedback] = useState(true)

  const mistakes = useMemo(() => mistakeIds(history, bank), [history, bank])

  const inCollections = useMemo(
    () => bank.questions.filter((q) => collections.includes(q.collection)),
    [bank.questions, collections],
  )
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const q of inCollections) m.set(q.topic, (m.get(q.topic) ?? 0) + 1)
    return m
  }, [inCollections])

  const pool = inCollections.filter((q) => topics.includes(q.topic) && (!onlyMistakes || mistakes.has(q.id)))
  const finalCount = count === 0 ? pool.length : Math.min(count, pool.length)

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const start = () => {
    if (session && !confirm('У вас є незавершений тест. Почати нове тренування і скасувати попередній?')) return
    const questions = shuffle(pool).slice(0, finalCount)
    const topicNames = [...new Set(questions.map((q) => q.topic))]
    setSession(
      createSession({
        mode: 'training',
        title:
          topicNames.length === 1
            ? `Тренування: ${bank.topicName(topicNames[0])}`
            : onlyMistakes
              ? 'Тренування: робота над помилками'
              : 'Вільне тренування',
        questions,
        timeLimitMin: null,
        instantFeedback,
        threshold: settings.threshold,
        topics: topicNames,
      }),
    )
    navigate('test')
  }

  return (
    <div className="page page-narrow">
      <h1>Вільне тренування</h1>
      <p className="muted">Без обмеження часу. Оберіть збірники, теми та кількість питань.</p>

      <div className="card stack">
        <div className="field">
          <span>Збірники</span>
          <div className="row">
            {bank.collections.map((c) => {
              const n = bank.questions.filter((q) => q.collection === c.id).length
              const on = collections.includes(c.id)
              return (
                <label key={c.id} className={`chip${on ? ' on' : ''}`} title={c.description}>
                  <input type="checkbox" checked={on} onChange={() => setCollections((l) => toggle(l, c.id))} />
                  {c.name} <span className="count">{n}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="field">
          <div className="row">
            <span style={{ fontWeight: 600 }}>Теми</span>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTopics(bank.topics.map((t) => t.id))}>
              Усі
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTopics([])}>
              Жодної
            </button>
          </div>
          <div className="row">
            {bank.topics
              .filter((t) => topicCounts.has(t.id))
              .map((t) => {
                const on = topics.includes(t.id)
                return (
                  <label key={t.id} className={`chip${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => setTopics((l) => toggle(l, t.id))} />
                    {t.name} <span className="count">{topicCounts.get(t.id)}</span>
                  </label>
                )
              })}
          </div>
        </div>

        <div className="field">
          <span>Кількість питань</span>
          <div className="segmented" role="radiogroup">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                className={count === n ? 'on' : ''}
                onClick={() => setCount(n)}
              >
                {n === 0 ? 'Усі' : n}
              </button>
            ))}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={onlyMistakes} onChange={(e) => setOnlyMistakes(e.target.checked)} />
          <span>
            <b>Лише питання з помилками</b>
            <br />
            <span className="muted small">
              Питання, на які ви востаннє відповіли неправильно або пропустили ({mistakes.size}).
            </span>
          </span>
        </label>

        <label className="check">
          <input type="checkbox" checked={instantFeedback} onChange={(e) => setInstantFeedback(e.target.checked)} />
          <span>
            <b>Показувати правильну відповідь і пояснення одразу</b>
          </span>
        </label>

        <div className="row">
          <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={finalCount === 0}>
            Почати тренування
          </button>
          <span className="muted">
            {finalCount > 0 ? `Буде ${finalCount} з ${pool.length} доступних питань` : 'Немає питань для вибраних умов'}
          </span>
        </div>
      </div>
    </div>
  )
}
