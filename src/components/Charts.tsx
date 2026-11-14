import type { TopicStat } from '../lib/session'
import { useApp } from '../store/context'

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
