import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPercent } from '../lib/util'
import { useChartTheme } from './useChartTheme'

export interface ScorePoint {
  index: number
  percent: number
  label: string
}

type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }

/** Compact single-series score trend with the pass threshold (lazy-loaded with Recharts). */
export default function ScoreTrend({ points, threshold }: { points: ScorePoint[]; threshold: number }) {
  const theme = useChartTheme()
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as ScorePoint
    return (
      <div className="chart-tooltip">
        <div className="tt-title">{p.label}</div>
        <div className="tt-row">
          <span className="tt-key" aria-hidden="true" />
          <b>{formatPercent(p.percent)}</b>
        </div>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis dataKey="index" hide />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ReferenceLine y={threshold} stroke={theme.label2} strokeWidth={1} />
        <Tooltip content={Content} cursor={{ stroke: theme.label2, strokeWidth: 1 }} isAnimationActive={false} />
        <Line
          type="linear"
          dataKey="percent"
          stroke={theme.series}
          strokeWidth={2}
          dot={{ r: 3.5, fill: theme.series, stroke: theme.surface, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: theme.series, stroke: theme.surface, strokeWidth: 2 }}
          isAnimationActive={!theme.reducedMotion}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
