import { useMemo, useState } from 'react'
import { TopicBars } from '../components/Charts'
import { QuestionView } from '../components/QuestionView'
import { navigate } from '../lib/router'
import { topicStats } from '../lib/session'
import { formatDate, formatDuration, formatPercent, pluralUk } from '../lib/util'
import { useApp } from '../store/context'

type Filter = 'all' | 'wrong' | 'skipped' | 'correct'

export function ResultsPage({ id }: { id: string }) {
  const { bank, history, deleteAttempt } = useApp()
  const record = history.find((r) => r.id === id)
  const [filter, setFilter] = useState<Filter>('all')
  const stats = useMemo(() => (record ? topicStats([record], bank) : []), [record, bank])

  if (!record) {
    return (
      <div className="page page-narrow">
        <div className="card empty">
          <h2>Результат не знайдено</h2>
          <a className="btn btn-secondary" href="#/history">
            До історії
          </a>
        </div>
      </div>
    )
  }

  const wrong = record.answered - record.correct
  const skipped = record.total - record.answered
  const items = record.items
    .map((item, index) => ({ item, index, question: bank.questionById.get(item.qid) }))
    .filter(({ item, question }) => {
      if (filter === 'all') return true
      if (item.chosen == null) return filter === 'skipped'
      const ok = question?.correct === item.chosen
      return filter === 'correct' ? ok : filter === 'wrong' ? !ok : false
    })

  const remove = () => {
    if (confirm('Видалити цю спробу з історії?')) {
      deleteAttempt(record.id)
      navigate('history')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Результати</h1>
          <span className="muted">
            {record.title} · {formatDate(record.finishedAt)}
          </span>
        </div>
        <div className="row">
          <a className="btn btn-secondary btn-sm" href={record.mode === 'exam' ? '#/exam' : '#/training'}>
            Пройти ще раз
          </a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
            Видалити спробу
          </button>
        </div>
      </div>

      <div className={`verdict ${record.passed ? 'pass' : 'fail'}`}>
        <div className="verdict-score">{formatPercent(record.percent)}</div>
        <div>
          <div className="verdict-title">{record.passed ? 'Склав' : 'Не склав'}</div>
          <div className="muted">
            Прохідний поріг — {record.threshold}% правильних відповідей
            {record.passed
              ? `, запас ${formatPercent(record.percent - record.threshold)}`
              : `, не вистачило ${formatPercent(record.threshold - record.percent)}`}
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-value">
            {record.correct} / {record.total}
          </div>
          <div className="stat-label">набрано балів</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatDuration(record.durationSec)}</div>
          <div className="stat-label">
            витрачено часу
            {record.timeLimitSec ? ` з ${formatDuration(record.timeLimitSec)}` : ''}
            {record.timedOut ? ' · час вийшов' : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--bad)' }}>
            {wrong}
          </div>
          <div className="stat-label">неправильних відповідей</div>
        </div>
        <div className="stat">
          <div className="stat-value">{skipped}</div>
          <div className="stat-label">без відповіді</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h2>За темами</h2>
          <TopicBars stats={stats} threshold={record.threshold} />
        </div>
        <div className="card">
          <div className="card-title">
            <h2>Нові слова цієї сесії</h2>
            <span className="badge badge-accent">
              {record.newWords.length} {pluralUk(record.newWords.length, 'слово', 'слова', 'слів')}
            </span>
          </div>
          {record.newWords.length === 0 ? (
            <p className="muted">
              Під час цього тесту нових слів до словника не додано. Натискайте на незнайомі слова в питаннях, щоб
              перекласти й зберегти їх.
            </p>
          ) : (
            <>
              <div className="word-list">
                {record.newWords.map((w) => (
                  <div className="word-chip" key={w.word}>
                    <b>{w.word}</b>
                    <span>{w.translation || '— без перекладу —'}</span>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <a className="btn btn-secondary btn-sm" href="#/dictionary">
                  Відкрити словник
                </a>
                <a className="btn btn-ghost btn-sm" href="#/flashcards">
                  Повторити картками
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Детальний розбір</h2>
          <div className="segmented">
            {(
              [
                ['all', `Усі (${record.total})`],
                ['wrong', `Помилки (${wrong})`],
                ['skipped', `Без відповіді (${skipped})`],
                ['correct', `Правильні (${record.correct})`],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button key={key} type="button" className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 && <div className="empty">Немає питань у цій категорії.</div>}

        {items.map(({ item, index, question }) => {
          const ok = question && item.chosen === question.correct
          return (
            <div className="review-item" key={item.qid + index}>
              <div className="review-head">
                <b>Питання {index + 1}</b>
                {question && <span className="badge">{bank.topicName(question.topic)}</span>}
                {item.chosen == null ? (
                  <span className="badge badge-warn">без відповіді</span>
                ) : ok ? (
                  <span className="badge badge-ok">правильно</span>
                ) : (
                  <span className="badge badge-bad">неправильно</span>
                )}
              </div>
              {question ? (
                <QuestionView question={question} order={item.order} chosen={item.chosen} reveal passageOpen={false} />
              ) : (
                <p className="muted">Питання видалене з бази.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
