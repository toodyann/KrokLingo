import { useMemo, useState } from 'react'
import { TopicBars } from '../components/Charts'
import { PageHeader } from '../components/PageHeader'
import { QuestionView } from '../components/QuestionView'
import { useToast } from '../components/toastContext'
import { navigate } from '../lib/router'
import { topicStats } from '../lib/session'
import { formatDate, formatDuration, formatPercent, pluralUk } from '../lib/util'
import { useApp } from '../store/context'

type Filter = 'all' | 'wrong' | 'skipped' | 'correct'

export function ResultsPage({ id }: { id: string }) {
  const { bank, history, deleteAttempt, addAttempt } = useApp()
  const toast = useToast()
  const record = history.find((r) => r.id === id)
  const [filter, setFilter] = useState<Filter>('all')
  const stats = useMemo(() => (record ? topicStats([record], bank) : []), [record, bank])

  if (!record) {
    return (
      <div className="page page-narrow">
        <PageHeader back={{ href: '#/history', label: 'Прогрес' }} title="Результати" />
        <div className="card empty">
          <h2 className="t-title3">Результат не знайдено</h2>
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
    deleteAttempt(record.id)
    toast({ message: 'Спробу видалено з історії', onAction: () => addAttempt(record) })
    navigate('history')
  }

  const filters: [Filter, string][] = [
    ['all', `Усі ${record.total}`],
    ['wrong', `Помилки ${wrong}`],
    ['skipped', `Без відповіді ${skipped}`],
    ['correct', `Правильні ${record.correct}`],
  ]

  return (
    <div className="page">
      <PageHeader
        back={{ href: '#/history', label: 'Прогрес' }}
        title="Результати"
        subtitle={`${record.title} · ${formatDate(record.finishedAt)}`}
        actions={
          <>
            <a className="btn btn-tinted btn-sm" href={record.mode === 'exam' ? '#/exam' : '#/training'}>
              Пройти ще раз
            </a>
            <button type="button" className="btn btn-destructive btn-sm" onClick={remove}>
              Видалити
            </button>
          </>
        }
      />

      <section className={`verdict ${record.passed ? 'pass' : 'fail'}`} aria-label="Підсумок">
        <div className="verdict-score">{formatPercent(record.percent)}</div>
        <div>
          <div className="verdict-title">{record.passed ? '✓ Склав' : '✗ Не склав'}</div>
          <div className="secondary t-subhead">
            Поріг {record.threshold}% ·{' '}
            {record.passed
              ? `запас ${formatPercent(record.percent - record.threshold)}`
              : `не вистачило ${formatPercent(record.threshold - record.percent)}`}
          </div>
        </div>
        <div className="verdict-gauge" aria-hidden="true">
          <div style={{ width: `${Math.min(100, record.percent)}%` }} />
          <span className="threshold-tick" style={{ left: `${record.threshold}%` }} />
        </div>
      </section>

      <div className="grid grid-stats section">
        <div className="stat">
          <div className="stat-value">
            {record.correct}
            <span className="secondary" style={{ fontWeight: 600 }}>
              {' '}
              / {record.total}
            </span>
          </div>
          <div className="stat-label">набрано балів</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatDuration(record.durationSec)}</div>
          <div className="stat-label">
            витрачено{record.timeLimitSec ? ` з ${formatDuration(record.timeLimitSec)}` : ''}
            {record.timedOut ? ' · час вийшов' : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: wrong ? 'var(--danger)' : undefined }}>
            {wrong}
          </div>
          <div className="stat-label">неправильних</div>
        </div>
        <div className="stat">
          <div className="stat-value">{skipped}</div>
          <div className="stat-label">без відповіді</div>
        </div>
      </div>

      <div className="grid grid-2 section">
        <section className="card">
          <h2 className="t-title3" style={{ marginBottom: 16 }}>
            За темами
          </h2>
          <TopicBars stats={stats} threshold={record.threshold} />
        </section>
        <section className="card">
          <div className="row" style={{ marginBottom: 14 }}>
            <h2 className="t-title3">Нові слова цієї сесії</h2>
            <span className="spacer" />
            <span className="pill">
              {record.newWords.length} {pluralUk(record.newWords.length, 'слово', 'слова', 'слів')}
            </span>
          </div>
          {record.newWords.length === 0 ? (
            <p className="secondary">Нових слів немає</p>
          ) : (
            <>
              <div className="word-list">
                {record.newWords.map((w) => (
                  <div className="word-chip" key={w.word}>
                    <b>{w.word}</b>
                    <span>{w.translation || 'без перекладу'}</span>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 16 }}>
                <a className="btn btn-tinted btn-sm" href="#/flashcards">
                  Повторити картками
                </a>
                <a className="btn btn-plain btn-sm" href="#/dictionary">
                  Відкрити словник
                </a>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 className="t-title3">Детальний розбір</h2>
          <span className="spacer" />
          <div className="segmented" role="radiogroup" aria-label="Фільтр питань">
            {filters.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={filter === key} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 && <div className="empty">Немає питань у цій категорії.</div>}

        {items.map(({ item, index, question }) => {
          const ok = question && item.chosen === question.correct
          return (
            <article className="review-item" key={item.qid + index}>
              <div className="review-head">
                <b className="tnum">Питання {index + 1}</b>
                {question && <span className="pill">{bank.topicName(question.topic)}</span>}
                {item.chosen == null ? (
                  <span className="pill pill-warning">без відповіді</span>
                ) : ok ? (
                  <span className="pill pill-success">✓ правильно</span>
                ) : (
                  <span className="pill pill-danger">✗ неправильно</span>
                )}
              </div>
              {question ? (
                <QuestionView question={question} order={item.order} chosen={item.chosen} reveal passageOpen={false} />
              ) : (
                <p className="secondary">Питання видалене з бази.</p>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
