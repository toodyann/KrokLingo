import { lazy, Suspense, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '../components/EmptyState'
import { Segmented } from '../components/Segmented'
import { IconChevronRight, IconHistory } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { startOfDay } from '../lib/stats'
import { formatDuration, formatPercent } from '../lib/util'
import { useApp } from '../store/context'
import type { AttemptRecord, Mode } from '../types'
import { link } from '../lib/router'

const ScoreTrend = lazy(() => import('../components/ScoreTrend'))

const MODES: [Mode | 'all', string][] = [
  ['all', 'Усі'],
  ['exam', 'Іспити'],
  ['training', 'Тренування'],
]

const dayFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })
const shortFmt = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function dayTitle(day: number): string {
  const today = startOfDay(Date.now())
  if (day === today) return 'Сьогодні'
  if (day === startOfDay(today - 1)) return 'Вчора'
  return dayFmt.format(day)
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** All attempts, newest first, grouped by day, each compared with the previous attempt of the same mode. */
export function HistoryPage() {
  const { history, settings } = useApp()
  const [mode, setMode] = useState<Mode | 'all'>('all')

  const filtered = useMemo(
    () => [...history].filter((r) => mode === 'all' || r.mode === mode).sort((a, b) => a.finishedAt - b.finishedAt),
    [history, mode],
  )

  // change vs. the previous attempt of the same mode
  const deltas = useMemo(() => {
    const last = new Map<Mode, number>()
    const out = new Map<string, number | null>()
    for (const r of [...history].sort((a, b) => a.finishedAt - b.finishedAt)) {
      const prev = last.get(r.mode)
      out.set(r.id, prev == null ? null : r.percent - prev)
      last.set(r.mode, r.percent)
    }
    return out
  }, [history])

  const groups = useMemo(() => {
    const byDay = new Map<number, AttemptRecord[]>()
    for (const r of [...filtered].reverse()) {
      const day = startOfDay(r.finishedAt)
      byDay.set(day, [...(byDay.get(day) ?? []), r])
    }
    return [...byDay]
  }, [filtered])

  const exams = filtered.filter((r) => r.mode === 'exam')
  const avg = filtered.length ? filtered.reduce((s, r) => s + r.percent, 0) / filtered.length : 0
  const best = filtered.length ? Math.max(...filtered.map((r) => r.percent)) : 0
  const trend = filtered.slice(-30).map((r, i) => ({
    index: i + 1,
    percent: round1(r.percent),
    label: `${r.mode === 'exam' ? 'Іспит' : 'Тренування'} · ${shortFmt.format(r.finishedAt)}`,
  }))

  return (
    <div className="page">
      <PageHeader
        title="Історія"
        actions={history.length > 0 && <Segmented value={mode} onChange={setMode} options={MODES} label="Режим" />}
      />

      {history.length === 0 ? (
        <EmptyState
          icon={<IconHistory />}
          title="Ще немає спроб"
          actions={
            <Button asChild>
              <a href={link('tests')}>До тестів</a>
            </Button>
          }
        >
          Кожен завершений тест з’явиться тут разом із детальним розбором.
        </EmptyState>
      ) : (
        <div className="split">
          <div>
            {groups.length === 0 ? (
              <EmptyState title="Немає спроб у цьому режимі" />
            ) : (
              groups.map(([day, records]) => (
                <section className="history-day" key={day}>
                  <h2 className="history-day-title">
                    <span>{dayTitle(day)}</span>
                    <span className="muted">{records.length}</span>
                  </h2>
                  <div className="list">
                    {records.map((r) => {
                      const d = deltas.get(r.id)
                      const dir = d == null || Math.abs(d) < 0.05 ? '' : d > 0 ? 'up' : 'down'
                      return (
                        <a key={r.id} className="list-row" href={link(`results/${r.id}`)}>
                          <div className="list-row-main">
                            <div>{r.mode === 'exam' ? 'Іспит' : r.title}</div>
                            <div className="secondary t-footnote tnum">
                              {timeFmt.format(r.finishedAt)} · {r.correct}/{r.total} · {formatDuration(r.durationSec)}
                            </div>
                          </div>
                          <span
                            className={`history-row-delta ${dir}`}
                            title="Порівняно з попередньою спробою цього режиму"
                          >
                            {d == null
                              ? ''
                              : `${dir === 'up' ? '▲ +' : dir === 'down' ? '▼ −' : ''}${formatPercent(Math.abs(d)).replace('%', '')} п.п.`}
                          </span>
                          <Badge variant={r.passed ? 'success' : 'destructive'} className="tnum">
                            {r.passed ? '✓' : '✗'} {formatPercent(r.percent)}
                          </Badge>
                          <IconChevronRight className="chev" />
                        </a>
                      )
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          <aside className="split-aside">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Динаміка результатів</CardTitle>
                <CardAction className="text-sm text-muted-foreground">останні {trend.length}</CardAction>
              </CardHeader>
              <CardContent>
                {trend.length < 2 ? (
                  <div className="chart-empty" style={{ minHeight: 140 }}>
                    Потрібно щонайменше 2 спроби
                  </div>
                ) : (
                  <div className="chart-card" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
                    <Suspense fallback={<div style={{ height: 180 }} />}>
                      <ScoreTrend points={trend} threshold={settings.threshold} />
                    </Suspense>
                  </div>
                )}
                <div className="summary-rows" style={{ marginTop: 'var(--s-4)' }}>
                  <div>
                    <span>Спроб</span>
                    <b>{filtered.length}</b>
                  </div>
                  <div>
                    <span>Середній результат</span>
                    <b>{filtered.length ? formatPercent(avg) : '—'}</b>
                  </div>
                  <div>
                    <span>Найкращий</span>
                    <b>{filtered.length ? formatPercent(best) : '—'}</b>
                  </div>
                  <div>
                    <span>Іспитів складено</span>
                    <b>
                      {exams.filter((r) => r.passed).length} з {exams.length}
                    </b>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  )
}
