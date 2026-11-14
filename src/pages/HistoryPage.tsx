import { useMemo, useState } from 'react'
import { ProgressChart, TopicBars } from '../components/Charts'
import { IconChevronRight } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { topicStats } from '../lib/session'
import { formatDate, formatDuration, formatPercent } from '../lib/util'
import { useApp } from '../store/context'
import type { Mode } from '../types'

export function HistoryPage() {
  const { bank, history, settings } = useApp()
  const [mode, setMode] = useState<Mode | 'all'>('all')
  const records = useMemo(
    () => history.filter((r) => mode === 'all' || r.mode === mode).sort((a, b) => b.finishedAt - a.finishedAt),
    [history, mode],
  )
  const stats = useMemo(() => topicStats(records, bank), [records, bank])

  const chronological = [...records].reverse()
  const avg = (list: typeof records) => list.reduce((s, r) => s + r.percent, 0) / (list.length || 1)
  const delta = records.length >= 4 ? avg(chronological.slice(-3)) - avg(chronological.slice(0, 3)) : null
  const best = records.length ? Math.max(...records.map((r) => r.percent)) : 0
  const exams = records.filter((r) => r.mode === 'exam')

  const modes: [Mode | 'all', string][] = [
    ['all', 'Усі'],
    ['exam', 'Іспити'],
    ['training', 'Тренування'],
  ]

  return (
    <div className="page">
      <PageHeader
        title="Прогрес"
        actions={
          <div className="segmented" role="radiogroup" aria-label="Режим">
            {modes.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)}>
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-stats section">
        <div className="stat">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">спроб</div>
        </div>
        <div className="stat">
          <div className="stat-value">{records.length ? formatPercent(avg(records)) : '—'}</div>
          <div className="stat-label">середній результат</div>
        </div>
        <div className="stat">
          <div className="stat-value">{records.length ? formatPercent(best) : '—'}</div>
          <div className="stat-label">найкращий</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {exams.filter((r) => r.passed).length}
            <span className="secondary"> / {exams.length}</span>
          </div>
          <div className="stat-label">іспитів складено</div>
        </div>
        <div className="stat">
          <div
            className="stat-value"
            style={{ color: delta == null ? undefined : delta >= 0 ? 'var(--success)' : 'var(--danger)' }}
          >
            {delta == null ? '—' : `${delta >= 0 ? '+' : '−'}${formatPercent(Math.abs(delta))}`}
          </div>
          <div className="stat-label">останні 3 проти перших 3</div>
        </div>
      </div>

      <section className="card section">
        <h2 className="t-title3" style={{ marginBottom: 12 }}>
          Шкала прогресу
        </h2>
        <ProgressChart records={records} threshold={settings.threshold} />
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="t-title3" style={{ marginBottom: 16 }}>
            Успішність за темами
          </h2>
          <TopicBars stats={stats} threshold={settings.threshold} />
        </section>
        <section>
          <h2 className="section-title">Усі спроби</h2>
          {records.length === 0 ? (
            <div className="card empty">Історія порожня — пройдіть перший тест.</div>
          ) : (
            <div className="list">
              {records.map((r) => (
                <a key={r.id} className="list-row" href={`#/results/${r.id}`}>
                  <div className="list-row-main">
                    <div>{r.mode === 'exam' ? 'Іспит' : r.title}</div>
                    <div className="secondary t-footnote tnum">
                      {formatDate(r.finishedAt)} · {r.correct}/{r.total} · {formatDuration(r.durationSec)}
                    </div>
                  </div>
                  <span className={`pill ${r.passed ? 'pill-success' : 'pill-danger'} tnum`}>
                    {formatPercent(r.percent)}
                  </span>
                  <IconChevronRight className="chev" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
