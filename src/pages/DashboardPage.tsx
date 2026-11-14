import { useMemo, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconBook, IconChevronRight, IconGrid, IconHistory, IconTests } from '../components/Icons'
import { Segmented } from '../components/Segmented'
import { PageHeader } from '../components/PageHeader'
import { useChartTheme, type ChartTheme } from '../components/useChartTheme'
import {
  activitySeries,
  attemptSeries,
  periodRange,
  previousRange,
  streakDays,
  summarize,
  topicSeries,
  type ActivityPoint,
  type AttemptPoint,
  type Period,
  type TopicPoint,
} from '../lib/stats'
import { liveStats, mistakeIds } from '../lib/session'
import { formatPercent, pluralUk } from '../lib/util'
import { useApp } from '../store/context'

/** Only what our tooltip renderers read from Recharts. */
type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }

const PERIODS: [Period, string][] = [
  [7, '7 днів'],
  [30, '30 днів'],
  [90, '90 днів'],
  ['all', 'Усе'],
]

const dayFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
const fullFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })
const timeFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const num = (n: number) => n.toLocaleString('uk-UA')

function minutesLabel(min: number): string {
  if (min < 60) return `${min} хв`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} год ${m} хв` : `${h} год`
}

export function DashboardPage() {
  const { bank, history, dictionary, settings, session } = useApp()
  const theme = useChartTheme()
  const [period, setPeriod] = useState<Period>(30)

  const data = useMemo(() => {
    const range = periodRange(period, history, dictionary)
    const prev = period === 'all' ? null : previousRange(range)
    return {
      range,
      now: summarize(history, dictionary, range),
      prev: prev ? summarize(history, dictionary, prev) : null,
      activity: activitySeries(history, dictionary, range),
      attempts: attemptSeries(history, range),
      topics: topicSeries(history, bank, range),
      streak: streakDays(history),
      mistakes: mistakeIds(history, bank).size,
    }
  }, [period, history, dictionary, bank])

  // No activity at all yet: guide the first steps instead of showing empty charts or zeros.
  if (history.length === 0 && dictionary.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Огляд" />
        <Card className="onboarding flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 p-6 md:p-8">
          <h2>Почніть підготовку до «Крок 1»</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <a href="#/exam">Почати іспит</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#/training">Тренування</a>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const { now, prev, activity, attempts, topics, streak, mistakes } = data
  const periodWord = period === 'all' ? 'за весь час' : `за ${period} днів`
  const toLearn = dictionary.filter((e) => !e.learned && e.translation).length

  return (
    <div className="page">
      <PageHeader
        title="Огляд"
        actions={
          <Segmented value={period} onChange={setPeriod} options={PERIODS} label="Період" />
        }
      />

      <div className="kpi-row">
        <Kpi label="Серія" value={`${streak} ${pluralUk(streak, 'день', 'дні', 'днів')}`} />
        <Kpi
          label="Відповідей"
          value={num(now.answered)}
          delta={prev ? { value: now.answered - prev.answered, text: signed(now.answered - prev.answered) } : undefined}
        />
        <Kpi
          label="Точність"
          value={now.accuracy == null ? '—' : formatPercent(now.accuracy)}
          delta={
            prev && now.accuracy != null && prev.accuracy != null
              ? { value: now.accuracy - prev.accuracy, text: `${signed(round1(now.accuracy - prev.accuracy))} п.п.` }
              : undefined
          }
        />
        <Kpi
          label="Нових слів"
          value={num(now.newWords)}
          delta={prev ? { value: now.newWords - prev.newWords, text: signed(now.newWords - prev.newWords) } : undefined}
        />
        <Kpi label="Час навчання" value={minutesLabel(Math.round(now.seconds / 60))} />
      </div>

      <div className="board">
        <ChartCard
          className="span-8"
          title={activity.bucket === 'week' ? 'Відповіді за тижнями' : 'Відповіді за днями'}
          value={
            <>
              <b>{num(now.answered)}</b> {periodWord}
            </>
          }
        >
          {now.answered === 0 ? (
            <div className="chart-empty">Немає відповідей {periodWord}</div>
          ) : (
            <ActivityChart points={activity.points} bucket={activity.bucket} theme={theme} />
          )}
        </ChartCard>

        <Card className="span-4">
          <CardHeader>
            <CardTitle className="text-base">Продовжити навчання</CardTitle>
          </CardHeader>
          <CardContent className="action-list">
            {session ? (
              <QuickAction
                primary
                href="#/test"
                icon={<IconTests />}
                title="Продовжити тест"
                sub={`${session.title} · ${liveStats(session, bank).answered} з ${session.questions.length}`}
              />
            ) : (
              <QuickAction
                primary
                href="#/exam"
                icon={<IconTests />}
                title="Симуляція іспиту"
                sub={`${settings.examQuestions} завдань · ${settings.examMinutes} хв`}
              />
            )}
            <QuickAction href="#/training" icon={<IconGrid />} title="Тренування за темами" sub="Без таймера" />
            <QuickAction
              href="#/flashcards"
              icon={<IconBook />}
              title="Повторити слова"
              sub={`${toLearn} ${pluralUk(toLearn, 'слово', 'слова', 'слів')} до вивчення`}
            />
            {mistakes > 0 && (
              <QuickAction
                href="#/training"
                icon={<IconHistory />}
                title="Робота над помилками"
                sub={`${mistakes} ${pluralUk(mistakes, 'питання', 'питання', 'питань')}`}
              />
            )}
          </CardContent>
        </Card>

        <ChartCard
          className="span-7"
          title="Результати спроб"
          value={
            attempts.length ? (
              <>
                <b>{formatPercent(attempts[attempts.length - 1].percent)}</b> остання
              </>
            ) : undefined
          }
        >
          {attempts.length === 0 ? (
            <div className="chart-empty">Немає спроб {periodWord}</div>
          ) : (
            <AttemptsChart points={attempts} threshold={settings.threshold} theme={theme} />
          )}
        </ChartCard>

        <ChartCard className="span-5" title="Правильні відповіді" value={<span>{periodWord}</span>}>
          {now.total === 0 ? (
            <div className="chart-empty">Немає відповідей {periodWord}</div>
          ) : (
            <AccuracyMeter
              correct={now.correct}
              wrong={now.answered - now.correct}
              skipped={now.skipped}
              total={now.total}
              threshold={settings.threshold}
            />
          )}
        </ChartCard>

        <ChartCard className="span-7" title="Точність за темами">
          {topics.length === 0 ? (
            <div className="chart-empty">Немає відповідей {periodWord}</div>
          ) : (
            <TopicMeters topics={topics} threshold={settings.threshold} />
          )}
        </ChartCard>

        <ChartCard
          className="span-5"
          title="Словник"
          value={
            <>
              <b>{num(dictionary.length)}</b> {pluralUk(dictionary.length, 'слово', 'слова', 'слів')}
            </>
          }
        >
          {dictionary.length === 0 ? (
            <div className="chart-empty">Словник порожній</div>
          ) : (
            <WordsChart points={activity.points} bucket={activity.bucket} theme={theme} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  title,
  sub,
  primary = false,
}: {
  href: string
  icon: ReactNode
  title: string
  sub: string
  primary?: boolean
}) {
  return (
    <a className={`action${primary ? ' primary' : ''}`} href={href}>
      <span className="action-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="action-main">
        <span className="action-title">{title}</span>
        <br />
        <span className="action-sub">{sub}</span>
      </span>
      <IconChevronRight className="chev" />
    </a>
  )
}

const round1 = (n: number) => Math.round(n * 10) / 10
const signed = (n: number) => (n > 0 ? `+${num(n)}` : n < 0 ? `−${num(Math.abs(n))}` : '0')

function Kpi({ label, value, delta }: { label: string; value: string; delta?: { value: number; text: string } }) {
  const dir = !delta || delta.value === 0 ? '' : delta.value > 0 ? 'up' : 'down'
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {delta && (
        <span
          className={`kpi-delta ${dir}`}
          title={`${delta.text} порівняно з попереднім періодом`}
          aria-label={`${delta.text} порівняно з попереднім періодом`}
        >
          {dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}
          {delta.text}
        </span>
      )}
    </div>
  )
}

function ChartCard({
  title,
  value,
  className = '',
  children,
}: {
  title: string
  value?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {value && <CardAction className="chart-card-value">{value}</CardAction>}
      </CardHeader>
      <CardContent className="chart-card flex flex-1 flex-col">{children}</CardContent>
    </Card>
  )
}

/* ---------- tooltips: values lead, labels follow ---------- */

function TooltipBox({ title, rows }: { title: string; rows: [ReactNode, string][] }) {
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{title}</div>
      {rows.map(([value, label], i) => (
        <div className="tt-row" key={i}>
          {i === 0 && <span className="tt-key" aria-hidden="true" />}
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

function bucketTitle(start: number, bucket: 'day' | 'week') {
  if (bucket === 'day') return fullFmt.format(start)
  return `Тиждень з ${dayFmt.format(start)}`
}

/* ---------- activity: answers per day (single series, columns) ---------- */

function ActivityChart({ points, bucket, theme }: { points: ActivityPoint[]; bucket: 'day' | 'week'; theme: ChartTheme }) {
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as ActivityPoint
    return (
      <TooltipBox
        title={bucketTitle(p.start, bucket)}
        rows={[
          [num(p.answered), pluralUk(p.answered, 'відповідь', 'відповіді', 'відповідей')],
          ...(p.answered
            ? ([
                [num(p.correct), `правильних · ${Math.round((p.correct / p.answered) * 100)}%`],
                [minutesLabel(p.minutes), 'навчання'],
              ] as [ReactNode, string][])
            : []),
        ]}
      />
    )
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="start"
            tickFormatter={(v: number) => dayFmt.format(v)}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={Content} cursor={{ fill: theme.grid, opacity: 0.5 }} isAnimationActive={false} />
          <Bar
            dataKey="answered"
            fill={theme.series}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={!theme.reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
      <DataTable
        caption="Відповіді за періодами"
        head={['Період', 'Відповідей', 'Правильних', 'Хвилин']}
        rows={points.filter((p) => p.answered).map((p) => [bucketTitle(p.start, bucket), p.answered, p.correct, p.minutes])}
      />
    </>
  )
}

/* ---------- dictionary growth (single series, area) ---------- */

function WordsChart({ points, bucket, theme }: { points: ActivityPoint[]; bucket: 'day' | 'week'; theme: ChartTheme }) {
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as ActivityPoint
    return <TooltipBox title={bucketTitle(p.start, bucket)} rows={[[num(p.words), 'слів у словнику']]} />
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="start"
            tickFormatter={(v: number) => dayFmt.format(v)}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            content={Content}
            cursor={{ stroke: theme.label2, strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="words"
            stroke={theme.series}
            strokeWidth={2}
            fill={theme.series}
            fillOpacity={0.1}
            activeDot={{ r: 5, fill: theme.series, stroke: theme.surface, strokeWidth: 2 }}
            isAnimationActive={!theme.reducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
      <DataTable
        caption="Розмір словника"
        head={['Період', 'Слів']}
        rows={points.map((p) => [bucketTitle(p.start, bucket), p.words])}
      />
    </>
  )
}

/* ---------- attempt scores against the pass threshold (single series, line) ---------- */

function AttemptsChart({ points, threshold, theme }: { points: AttemptPoint[]; threshold: number; theme: ChartTheme }) {
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as AttemptPoint
    return (
      <TooltipBox
        title={`${p.mode === 'exam' ? 'Іспит' : 'Тренування'} · ${timeFmt.format(p.finishedAt)}`}
        rows={[[formatPercent(p.percent), p.passed ? 'склав' : 'не склав']]}
      />
    )
  }
  const last = points[points.length - 1]
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="index"
            tickFormatter={(v: number) => `#${v}`}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
            minTickGap={16}
          />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} width={44} />
          <ReferenceLine
            y={threshold}
            stroke={theme.label2}
            strokeWidth={1}
            label={{ value: `поріг ${threshold}%`, position: 'insideTopRight' }}
          />
          <Tooltip content={Content} cursor={{ stroke: theme.label2, strokeWidth: 1 }} isAnimationActive={false} />
          <Line
            type="linear"
            dataKey="percent"
            stroke={theme.series}
            strokeWidth={2}
            dot={{ r: 4, fill: theme.series, stroke: theme.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: theme.series, stroke: theme.surface, strokeWidth: 2 }}
            isAnimationActive={!theme.reducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
      <DataTable
        caption="Результати спроб"
        head={['Спроба', 'Дата', 'Режим', 'Результат']}
        rows={points.map((p) => [
          `#${p.index}`,
          timeFmt.format(p.finishedAt),
          p.mode === 'exam' ? 'Іспит' : 'Тренування',
          formatPercent(p.percent),
        ])}
      />
      <span className="sr-only">Остання спроба: {formatPercent(last.percent)}</span>
    </>
  )
}

/* ---------- one ratio against the pass limit: a meter ---------- */

function AccuracyMeter({
  correct,
  wrong,
  skipped,
  total,
  threshold,
}: {
  correct: number
  wrong: number
  skipped: number
  total: number
  threshold: number
}) {
  const pct = (correct / total) * 100
  return (
    <div>
      <div className="meter-hero">
        <span className="hero">{formatPercent(pct)}</span>
        <span className="secondary">
          {num(correct)} з {num(total)}
        </span>
      </div>
      <div
        className="meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`Правильних ${formatPercent(pct)}, поріг ${threshold}%`}
      >
        <div className="meter-fill" style={{ width: `${pct}%` }} />
        <span className="meter-limit" style={{ left: `${threshold}%` }} aria-hidden="true" />
      </div>
      <div className="meter-scale" aria-hidden="true">
        <span>0%</span>
        <span>поріг {threshold}%</span>
        <span>100%</span>
      </div>
      <div className="split-list">
        <div>
          <b>{num(correct)}</b>
          <span>правильно</span>
        </div>
        <div>
          <b>{num(wrong)}</b>
          <span>неправильно</span>
        </div>
        <div>
          <b>{num(skipped)}</b>
          <span>без відповіді</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- several ratios, one per topic: a meter list ---------- */

function TopicMeters({ topics, threshold }: { topics: TopicPoint[]; threshold: number }) {
  return (
    <div className="meter-list">
      {topics.map((t) => (
        <div className="meter-row" key={t.topic}>
          <span>{t.name}</span>
          <div
            className="meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(t.percent)}
            aria-label={`${t.name}: ${formatPercent(t.percent)}, ${t.correct} з ${t.total}`}
          >
            <div className="meter-fill" style={{ width: `${t.percent}%` }} />
            <span className="meter-limit" style={{ left: `${threshold}%` }} aria-hidden="true" />
          </div>
          <span className="figure" title={`${t.correct} з ${t.total}`}>
            {Math.round(t.percent)}%
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------- table view for assistive technology ---------- */

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
