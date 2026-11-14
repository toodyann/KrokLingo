import { useMemo, useState } from 'react'
import { IconChevronRight } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { startOfDay } from '../lib/stats'
import { formatDuration, formatPercent } from '../lib/util'
import { useApp } from '../store/context'
import type { AttemptRecord, Mode } from '../types'

const MODES: [Mode | 'all', string][] = [
  ['all', 'Усі'],
  ['exam', 'Іспити'],
  ['training', 'Тренування'],
]

const dayFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })

function dayTitle(day: number): string {
  const today = startOfDay(Date.now())
  if (day === today) return 'Сьогодні'
  if (day === startOfDay(today - 1)) return 'Вчора'
  return dayFmt.format(day)
}

/** All attempts, newest first, grouped by day. */
export function HistoryPage() {
  const { history } = useApp()
  const [mode, setMode] = useState<Mode | 'all'>('all')

  const groups = useMemo(() => {
    const byDay = new Map<number, AttemptRecord[]>()
    for (const r of [...history].sort((a, b) => b.finishedAt - a.finishedAt)) {
      if (mode !== 'all' && r.mode !== mode) continue
      const day = startOfDay(r.finishedAt)
      byDay.set(day, [...(byDay.get(day) ?? []), r])
    }
    return [...byDay]
  }, [history, mode])

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Історія"
        actions={
          <div className="segmented" role="radiogroup" aria-label="Режим">
            {MODES.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)}>
                {label}
              </button>
            ))}
          </div>
        }
      />

      {groups.length === 0 ? (
        <div className="card empty">
          <h2 className="t-title3">Ще немає спроб</h2>
          <a className="btn btn-primary" href="#/tests" style={{ marginTop: 12 }}>
            До тестів
          </a>
        </div>
      ) : (
        groups.map(([day, records]) => (
          <section className="section" key={day}>
            <h2 className="section-title">{dayTitle(day)}</h2>
            <div className="list">
              {records.map((r) => (
                <a key={r.id} className="list-row" href={`#/results/${r.id}`}>
                  <div className="list-row-main">
                    <div>{r.mode === 'exam' ? 'Іспит' : r.title}</div>
                    <div className="secondary t-footnote tnum">
                      {timeFmt.format(r.finishedAt)} · {r.correct}/{r.total} · {formatDuration(r.durationSec)}
                    </div>
                  </div>
                  <span className={`pill ${r.passed ? 'pill-success' : 'pill-danger'} tnum`}>
                    {r.passed ? '✓' : '✗'} {formatPercent(r.percent)}
                  </span>
                  <IconChevronRight className="chev" />
                </a>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
