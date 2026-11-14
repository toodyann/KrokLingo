import { useMemo, useState } from 'react'
import { ProgressChart, TopicBars } from '../components/Charts'
import { navigate } from '../lib/router'
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
  const first = chronological.slice(0, 3)
  const last = chronological.slice(-3)
  const avg = (list: typeof records) => list.reduce((s, r) => s + r.percent, 0) / (list.length || 1)
  const delta = records.length >= 4 ? avg(last) - avg(first) : null
  const totalAnswers = records.reduce((s, r) => s + r.total, 0)
  const totalCorrect = records.reduce((s, r) => s + r.correct, 0)

  return (
    <div className="page">
      <div className="page-head">
        <h1>Прогрес та історія</h1>
        <div className="segmented">
          {(
            [
              ['all', 'Усі'],
              ['exam', 'Іспити'],
              ['training', 'Тренування'],
            ] as [Mode | 'all', string][]
          ).map(([key, label]) => (
            <button key={key} type="button" className={mode === key ? 'on' : ''} onClick={() => setMode(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">спроб</div>
        </div>
        <div className="stat">
          <div className="stat-value">{records.length ? formatPercent(avg(records)) : '—'}</div>
          <div className="stat-label">середній результат</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {totalCorrect}/{totalAnswers}
          </div>
          <div className="stat-label">правильних відповідей загалом</div>
        </div>
        <div className="stat">
          <div
            className="stat-value"
            style={{ color: delta == null ? undefined : delta >= 0 ? 'var(--ok)' : 'var(--bad)' }}
          >
            {delta == null ? '—' : `${delta >= 0 ? '▲' : '▼'} ${formatPercent(Math.abs(delta))}`}
          </div>
          <div className="stat-label">динаміка: останні 3 спроби проти перших 3</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Шкала прогресу</h2>
        <ProgressChart records={records} threshold={settings.threshold} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h2>Успішність за темами</h2>
          <TopicBars stats={stats} threshold={settings.threshold} />
        </div>
        <div className="card">
          <h2>Усі спроби</h2>
          {records.length === 0 ? (
            <div className="empty">Історія порожня.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Режим</th>
                    <th>Бали</th>
                    <th>%</th>
                    <th>Час</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`results/${r.id}`)}>
                      <td>{formatDate(r.finishedAt)}</td>
                      <td>{r.mode === 'exam' ? 'Іспит' : 'Тренування'}</td>
                      <td>
                        {r.correct}/{r.total}
                      </td>
                      <td>
                        <span className={`badge ${r.passed ? 'badge-ok' : 'badge-bad'}`}>{formatPercent(r.percent)}</span>
                      </td>
                      <td className="muted">{formatDuration(r.durationSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
