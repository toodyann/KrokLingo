import type { TopicStat } from '../lib/session'
import { formatDate, formatPercent } from '../lib/util'
import { useApp } from '../store/context'
import type { AttemptRecord } from '../types'

const W = 640
const H = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 40 }

/** Line chart of the percentage of correct answers across all attempts. */
export function ProgressChart({ records, threshold }: { records: AttemptRecord[]; threshold: number }) {
  if (records.length === 0) {
    return <div className="empty">Ще немає спроб</div>
  }

  const sorted = [...records].sort((a, b) => a.finishedAt - b.finishedAt)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const n = sorted.length
  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (p: number) => PAD.top + innerH - (p / 100) * innerH

  const points = sorted.map((r, i) => [x(i), y(r.percent)] as const)
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = `${line} L${points[n - 1][0].toFixed(1)},${y(0)} L${points[0][0].toFixed(1)},${y(0)} Z`

  // moving average over the last 3 attempts — the trend line
  const trend = sorted.map((_, i) => {
    const win = sorted.slice(Math.max(0, i - 2), i + 1)
    return [x(i), y(win.reduce((s, r) => s + r.percent, 0) / win.length)] as const
  })
  const trendPath = trend.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')

  const labelEvery = Math.max(1, Math.ceil(n / 8))

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Графік відсотка правильних відповідей за спробами">
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(p)} y2={y(p)} />
            <text className="axis-label" x={PAD.left - 8} y={y(p) + 4} textAnchor="end">
              {p}%
            </text>
          </g>
        ))}
        <line className="threshold" x1={PAD.left} x2={W - PAD.right} y1={y(threshold)} y2={y(threshold)} />
        <text className="threshold-label" x={W - PAD.right} y={y(threshold) - 5} textAnchor="end">
          поріг {threshold}%
        </text>
        <path className="area" d={area} />
        {n > 2 && <path className="trend" d={trendPath} />}
        <path className="line" d={line} />
        {sorted.map((r, i) => (
          <g key={r.id}>
            <circle
              className={`dot ${r.percent >= threshold ? 'pass' : 'fail'}${r.mode === 'exam' ? ' exam' : ''}`}
              cx={points[i][0]}
              cy={points[i][1]}
              r={r.mode === 'exam' ? 6 : 4.5}
            >
              <title>
                {`${r.mode === 'exam' ? 'Іспит' : 'Тренування'} · ${formatDate(r.finishedAt)} · ${formatPercent(r.percent)}`}
              </title>
            </circle>
            {(i % labelEvery === 0 || i === n - 1) && (
              <text className="axis-label" x={points[i][0]} y={H - 8} textAnchor="middle">
                #{i + 1}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          <i style={{ background: 'var(--success)' }} />
          не нижче порогу
        </span>
        <span>
          <i style={{ background: 'var(--danger)' }} />
          нижче порогу
        </span>
        <span>більша точка — іспит</span>
        {n > 2 && <span>пунктир — тренд за 3 спроби</span>}
      </div>
    </div>
  )
}

export function TopicBars({ stats, threshold }: { stats: TopicStat[]; threshold: number }) {
  const { bank } = useApp()
  if (stats.length === 0) return <div className="empty">Ще немає даних</div>
  return (
    <div className="bars">
      {stats.map((s) => {
        const pct = s.total ? (s.correct / s.total) * 100 : 0
        return (
          <div className="bar-row" key={s.topic}>
            <span>{bank.topicName(s.topic)}</span>
            <div className="bar-track">
              <div className={`bar-fill${pct < threshold ? ' low' : ''}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="bar-value">
              {Math.round(pct)}% · {s.correct}/{s.total}
            </span>
          </div>
        )
      })}
    </div>
  )
}
