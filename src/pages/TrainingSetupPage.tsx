import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { navigate } from '../lib/router'
import { createSession, mistakeIds } from '../lib/session'
import { pluralUk, shuffle } from '../lib/util'
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
    if (session && !confirm('Незавершений тест буде скасовано, а його відповіді втрачено. Почати тренування?')) return
    const questions = shuffle(pool).slice(0, finalCount)
    const topicNames = [...new Set(questions.map((q) => q.topic))]
    setSession(
      createSession({
        mode: 'training',
        title:
          topicNames.length === 1
            ? `Тренування: ${bank.topicName(topicNames[0])}`
            : onlyMistakes
              ? 'Робота над помилками'
              : 'Тренування',
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
      <PageHeader back={{ href: '#/', label: 'Тести' }} title="Тренування" />

      <section className="section">
        <h2 className="section-title">Збірники</h2>
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
      </section>

      <section className="section">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 className="section-title" style={{ margin: '0 0 0 16px' }}>
            Теми
          </h2>
          <span className="spacer" />
          <button type="button" className="btn btn-plain btn-sm" onClick={() => setTopics(bank.topics.map((t) => t.id))}>
            Усі
          </button>
          <button type="button" className="btn btn-plain btn-sm" onClick={() => setTopics([])}>
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
      </section>

      <section className="section">
        <h2 className="section-title">Кількість питань</h2>
        <div className="segmented" role="radiogroup" aria-label="Кількість питань">
          {COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={count === n}
              onClick={() => setCount(n)}
              style={{ minWidth: 52 }}
            >
              {n === 0 ? 'Усі' : n}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="list">
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <div className="list-row-main">Лише питання з помилками</div>
            <span className="list-row-value">{mistakes.size}</span>
            <input type="checkbox" className="switch" checked={onlyMistakes} onChange={(e) => setOnlyMistakes(e.target.checked)} />
          </label>
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <div className="list-row-main">Показувати відповідь і пояснення одразу</div>
            <input
              type="checkbox"
              className="switch"
              checked={instantFeedback}
              onChange={(e) => setInstantFeedback(e.target.checked)}
            />
          </label>
        </div>
      </section>

      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={start} disabled={finalCount === 0}>
        {finalCount > 0
          ? `Почати · ${finalCount} ${pluralUk(finalCount, 'питання', 'питання', 'питань')}`
          : 'Немає питань для цих умов'}
      </button>
    </div>
  )
}
