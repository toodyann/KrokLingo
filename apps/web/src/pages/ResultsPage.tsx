import { useMemo, useState } from 'react'
import { TopicBars } from '../components/Charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '../components/EmptyState'
import { Segmented } from '../components/Segmented'
import { PageHeader } from '../components/PageHeader'
import { QuestionView } from '../components/QuestionView'
import { useToast } from '../components/toastContext'
import { navigate, link } from '../lib/router'
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
      <div className="page">
        <PageHeader back={{ href: link('history'), label: 'Історія' }} title="Результати" />
        <EmptyState
          title="Результат не знайдено"
          actions={
            <Button asChild variant="outline">
              <a href={link('history')}>До історії</a>
            </Button>
          }
        />
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
        back={{ href: link('history'), label: 'Історія' }}
        title="Результати"
        subtitle={`${record.title} · ${formatDate(record.finishedAt)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={record.mode === 'exam' ? link('exam') : link('training')}>Пройти ще раз</a>
            </Button>
            <Button variant="destructive" onClick={remove}>
              Видалити
            </Button>
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

      <div className="split">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Детальний розбір</CardTitle>
            <CardAction>
              <Segmented value={filter} onChange={setFilter} options={filters} label="Фільтр питань" />
            </CardAction>
          </CardHeader>
          <CardContent>
            {items.length === 0 && <EmptyState bare title="Немає питань у цій категорії" />}

            {items.map(({ item, index, question }) => {
              const ok = question && item.chosen === question.correct
              return (
                <article className="review-item" key={item.qid + index}>
                  <div className="review-head">
                    <b className="tnum">Питання {index + 1}</b>
                    {question && <Badge variant="secondary">{bank.topicName(question.topic)}</Badge>}
                    {item.chosen == null ? (
                      <Badge variant="warning">без відповіді</Badge>
                    ) : ok ? (
                      <Badge variant="success">✓ правильно</Badge>
                    ) : (
                      <Badge variant="destructive">✗ неправильно</Badge>
                    )}
                  </div>
                  {question ? (
                    <QuestionView
                      question={question}
                      order={item.order}
                      chosen={item.chosen}
                      reveal
                      passageOpen={false}
                    />
                  ) : (
                    <p className="secondary">Питання видалене з бази.</p>
                  )}
                </article>
              )
            })}
          </CardContent>
        </Card>

        <aside className="split-aside">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">За темами</CardTitle>
            </CardHeader>
            <CardContent>
              <TopicBars stats={stats} threshold={record.threshold} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Нові слова цієї сесії</CardTitle>
              <CardAction>
                <Badge variant="secondary">
                  {record.newWords.length} {pluralUk(record.newWords.length, 'слово', 'слова', 'слів')}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              {record.newWords.length === 0 ? (
                <p className="text-muted-foreground">Нових слів немає</p>
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
                    <Button asChild size="sm" variant="secondary">
                      <a href={link('flashcards')}>Повторити картками</a>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={link('dictionary')}>Відкрити словник</a>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
