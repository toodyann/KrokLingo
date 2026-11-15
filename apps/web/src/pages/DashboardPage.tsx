import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
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
import {
  BookA,
  ChevronRight,
  Clock,
  Flame,
  LayoutGrid,
  MessageSquareText,
  Play,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Languages,
  type LucideProps,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mascot } from '../components/Mascot'
import { Segmented } from '../components/Segmented'
import { PageHeader } from '../components/PageHeader'
import { useChartTheme, type ChartTheme } from '../components/useChartTheme'
import {
  activitySeries,
  attemptSeries,
  periodRange,
  previousRange,
  startOfDay,
  streakDays,
  summarize,
  topicSeries,
  type ActivityPoint,
  type AttemptPoint,
  type Period,
  type Summary,
  type TopicPoint,
} from '../lib/stats'
import { liveStats, mistakeIds } from '../lib/session'
import { formatPercent, pluralUk } from '../lib/util'
import { useApp } from '../store/context'
import { link } from '../lib/router'
import type { AttemptRecord } from '../types'

/** Only what our tooltip renderers read from Recharts. */
type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }

type Tone = 'lime' | 'purple' | 'sky' | 'coral'

const PERIODS: [Period, string][] = [
  [7, '7 днів'],
  [30, '30 днів'],
  [90, '90 днів'],
  ['all', 'Усе'],
]

const dayFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
const fullFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })
const timeFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' })

const num = (n: number) => n.toLocaleString('uk-UA')

function minutesLabel(min: number): string {
  if (min < 60) return `${min} хв`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} год ${m} хв` : `${h} год`
}

/** The last seven days, oldest first, and whether a test was finished on each. */
function lastWeek(history: AttemptRecord[], now = Date.now()): { day: number; active: boolean }[] {
  const days = new Set(history.map((r) => startOfDay(r.finishedAt)))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const day = startOfDay(d.getTime())
    return { day, active: days.has(day) }
  })
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
      week: lastWeek(history),
      mistakes: mistakeIds(history, bank).size,
    }
  }, [period, history, dictionary, bank])

  // No activity at all yet: guide the first steps instead of showing empty charts or zeros.
  if (history.length === 0 && dictionary.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Головна" subtitle="Час прокачати знання! 🚀" />
        <section className="hero-card onboarding" aria-labelledby="onboarding-title">
          <div className="hero-body">
            <span className="hero-eyebrow">Ласкаво просимо до KrokLingo</span>
            <h2 id="onboarding-title">Ваш шлях до Кроку</h2>
            <p>
              Складіть пробний іспит або потренуйтеся за темами. Незнайомі слова з питань потраплять у словник, а
              тут з’явиться ваш прогрес.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg" className="hero-cta rounded-xl bg-white px-5 font-semibold text-[var(--ink)] shadow-lg hover:bg-white/90">
                <a href={link('exam')}>Почати іспит</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="hero-ghost rounded-xl border-white/35 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white dark:border-white/35 dark:bg-white/10 dark:hover:bg-white/20">
                <a href={link('training')}>Тренування</a>
              </Button>
            </div>
          </div>
          <Mascot pose="thumb" size={220} className="hero-mascot" />
        </section>
      </div>
    )
  }

  const { now, prev, activity, attempts, topics, streak, week, mistakes } = data
  const periodWord = period === 'all' ? 'за весь час' : `за ${period} днів`
  const prevWord = period === 'all' ? '' : `проти попередніх ${period} днів`
  const toLearn = dictionary.filter((e) => !e.learned && e.translation).length
  const activeDays = week.filter((d) => d.active).length

  return (
    <div className="page dashboard">
      <PageHeader
        title="Головна"
        subtitle="Час прокачати знання! 🚀"
        actions={<Segmented value={period} onChange={setPeriod} options={PERIODS} label="Період" />}
      />

      <div className="stat-cards">
        <StatCard
          tone="lime"
          icon={Flame}
          label="Серія"
          value={num(streak)}
          unit={pluralUk(streak, 'день', 'дні', 'днів')}
        >
          <div className="week-dots" role="img" aria-label={`Активних днів за тиждень: ${activeDays} з 7`}>
            {week.map((d) => (
              <span key={d.day} className={d.active ? 'on' : undefined} title={fullFmt.format(d.day)}>
                {weekdayFmt.format(d.day).slice(0, 2)}
              </span>
            ))}
          </div>
        </StatCard>

        <StatCard tone="purple" icon={MessageSquareText} label="Відповіді" value={num(now.answered)}>
          {prev ? (
            <Delta value={now.answered - prev.answered} text={signed(now.answered - prev.answered)} context={prevWord} />
          ) : (
            <span className="stat-card-note">{periodWord}</span>
          )}
        </StatCard>

        <StatCard
          tone="sky"
          icon={Target}
          label="Точність"
          value={now.accuracy == null ? '—' : formatPercent(now.accuracy)}
        >
          <div className="mini-meter" aria-hidden="true">
            <span className="mini-meter-fill" style={{ width: `${now.accuracy ?? 0}%` }} />
            <span className="mini-meter-limit" style={{ left: `${settings.threshold}%` }} />
          </div>
          {prev && now.accuracy != null && prev.accuracy != null ? (
            <Delta
              value={now.accuracy - prev.accuracy}
              text={`${signed(round1(now.accuracy - prev.accuracy))} п.п.`}
              context={prevWord}
            />
          ) : (
            <span className="stat-card-note">поріг {settings.threshold}%</span>
          )}
        </StatCard>

        <StatCard tone="coral" icon={Languages} label="Нових слів" value={num(now.newWords)}>
          {prev ? (
            <Delta value={now.newWords - prev.newWords} text={signed(now.newWords - prev.newWords)} context={prevWord} />
          ) : (
            <span className="stat-card-note">{periodWord}</span>
          )}
          <span className="stat-card-note">
            {num(toLearn)} {pluralUk(toLearn, 'слово', 'слова', 'слів')} до вивчення
          </span>
        </StatCard>
      </div>

      <div className="board">
        <ProgressHero
          className="span-8"
          now={now}
          threshold={settings.threshold}
          periodWord={periodWord}
          topics={topics.length}
          resume={session != null}
        />

        <Card className="dash-card tone-lime span-4 rounded-2xl bg-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Продовжити навчання</CardTitle>
          </CardHeader>
          <CardContent className="action-list">
            {session ? (
              <QuickAction
                tone="lime"
                href={link('test')}
                icon={Play}
                title="Продовжити тест"
                sub={`${session.title} · ${liveStats(session, bank).answered} з ${session.questions.length}`}
              />
            ) : (
              <QuickAction
                tone="lime"
                href={link('exam')}
                icon={Play}
                title="Симуляція іспиту"
                sub={`${settings.examQuestions} завдань · ${settings.examMinutes} хв`}
              />
            )}
            <QuickAction tone="purple" href={link('training')} icon={LayoutGrid} title="Тренування за темами" sub="Без таймера" />
            <QuickAction
              tone="sky"
              href={link('flashcards')}
              icon={BookA}
              title="Повторити слова"
              sub={`${toLearn} ${pluralUk(toLearn, 'слово', 'слова', 'слів')} до вивчення`}
            />
            <QuickAction
              tone="coral"
              href={link('training')}
              icon={RotateCcw}
              title="Робота над помилками"
              sub={
                mistakes > 0
                  ? `${mistakes} ${pluralUk(mistakes, 'питання', 'питання', 'питань')}`
                  : 'Помилок поки немає'
              }
            />
          </CardContent>
        </Card>

        <ChartCard
          className="span-8"
          tone="sky"
          title={activity.bucket === 'week' ? 'Відповіді за тижнями' : 'Відповіді за днями'}
          value={
            <>
              <b>{num(now.answered)}</b> {periodWord}
            </>
          }
        >
          {now.answered === 0 ? (
            <ChartEmpty>Немає відповідей {periodWord}</ChartEmpty>
          ) : (
            <ActivityChart points={activity.points} bucket={activity.bucket} theme={theme} color={theme.accent.sky} />
          )}
        </ChartCard>

        <ChartCard className="span-4" tone="lime" title="Правильні відповіді" value={<span>{periodWord}</span>}>
          {now.total === 0 ? (
            <ChartEmpty>Немає відповідей {periodWord}</ChartEmpty>
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

        <ChartCard
          className="span-6"
          tone="purple"
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
            <ChartEmpty>Немає спроб {periodWord}</ChartEmpty>
          ) : (
            <AttemptsChart points={attempts} threshold={settings.threshold} theme={theme} color={theme.accent.purple} />
          )}
        </ChartCard>

        <ChartCard
          className="span-6"
          tone="coral"
          title="Словник"
          value={
            <>
              <b>{num(dictionary.length)}</b> {pluralUk(dictionary.length, 'слово', 'слова', 'слів')}
            </>
          }
        >
          {dictionary.length === 0 ? (
            <ChartEmpty>Словник порожній</ChartEmpty>
          ) : (
            <WordsChart points={activity.points} bucket={activity.bucket} theme={theme} color={theme.accent.coral} />
          )}
        </ChartCard>

        <ChartCard className="span-12" tone="sky" title="Точність за темами" value={<span>поріг {settings.threshold}%</span>}>
          {topics.length === 0 ? (
            <ChartEmpty>Немає відповідей {periodWord}</ChartEmpty>
          ) : (
            <TopicMeters topics={topics} threshold={settings.threshold} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

/* ---------- bright stat cards ---------- */

function StatCard({
  tone,
  icon: Icon,
  label,
  value,
  unit,
  children,
}: {
  tone: Tone
  icon: ComponentType<LucideProps>
  label: string
  value: string
  unit?: string
  children?: ReactNode
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <Icon className="stat-card-deco" aria-hidden="true" strokeWidth={1.5} />
      <div className="stat-card-head">
        <span className="stat-card-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={2.25} />
        </span>
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value">
        {value}
        {unit && <span className="stat-card-unit"> {unit}</span>}
      </div>
      {children && <div className="stat-card-foot">{children}</div>}
    </div>
  )
}

function Delta({ value, text, context }: { value: number; text: string; context: string }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null
  const full = `${text} ${context}`
  return (
    <span className="stat-card-delta" title={full} aria-label={full}>
      <b>
        {Icon && <Icon size={14} strokeWidth={2.5} aria-hidden="true" />}
        {text}
      </b>
      <span>{context}</span>
    </span>
  )
}

/* ---------- progress message with the mascot ---------- */

function ProgressHero({
  className,
  now,
  threshold,
  periodWord,
  topics,
  resume,
}: {
  className: string
  now: Summary
  threshold: number
  periodWord: string
  topics: number
  resume: boolean
}) {
  let title: string
  let text: string
  if (now.answered === 0 || now.accuracy == null) {
    title = 'Час повернутися до навчання'
    text = `Немає відповідей ${periodWord}. Пройдіть короткий тест — і графіки оживуть.`
  } else if (now.accuracy >= threshold) {
    title = 'Чудова робота! 🎉'
    text = `Точність ${formatPercent(now.accuracy)} — вище порогу ${threshold}%. Так тримати!`
  } else {
    title = 'Ще трохи — і поріг ваш!'
    text = `До порогу ${threshold}% лишилося ${num(round1(threshold - now.accuracy))} п.п. Кожна спроба наближає до мети.`
  }
  return (
    <section className={`hero-card ${className}`} aria-labelledby="progress-title">
      <div className="hero-body">
        <span className="hero-eyebrow">Ваш прогрес {periodWord}</span>
        <h2 id="progress-title">{title}</h2>
        <p>{text}</p>
        <ul className="hero-chips">
          <li>
            <Trophy size={16} aria-hidden="true" />
            {num(now.attempts)} {pluralUk(now.attempts, 'спроба', 'спроби', 'спроб')}
          </li>
          <li>
            <Clock size={16} aria-hidden="true" />
            {minutesLabel(Math.round(now.seconds / 60))} навчання
          </li>
          <li>
            <LayoutGrid size={16} aria-hidden="true" />
            {num(topics)} {pluralUk(topics, 'тема', 'теми', 'тем')}
          </li>
        </ul>
        <div className="hero-actions">
          <Button asChild size="lg" className="hero-cta rounded-xl bg-white px-5 font-semibold text-[var(--ink)] shadow-lg hover:bg-white/90">
            <a href={link(resume ? 'test' : 'exam')}>{resume ? 'Продовжити тест' : 'Почати іспит'}</a>
          </Button>
        </div>
      </div>
      <Mascot pose="cheer" size={250} className="hero-mascot" />
    </section>
  )
}

function QuickAction({
  tone,
  href,
  icon: Icon,
  title,
  sub,
}: {
  tone: Tone
  href: string
  icon: ComponentType<LucideProps>
  title: string
  sub: string
}) {
  return (
    <a className={`action tone-${tone}`} href={href}>
      <span className="action-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.25} />
      </span>
      <span className="action-main">
        <span className="action-title">{title}</span>
        <span className="action-sub">{sub}</span>
      </span>
      <ChevronRight className="chev" aria-hidden="true" />
    </a>
  )
}

const round1 = (n: number) => Math.round(n * 10) / 10
const signed = (n: number) => (n > 0 ? `+${num(n)}` : n < 0 ? `−${num(Math.abs(n))}` : '0')

function ChartCard({
  title,
  value,
  tone,
  className = '',
  children,
}: {
  title: string
  value?: ReactNode
  tone: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={`dash-card tone-${tone} rounded-2xl bg-card/70 backdrop-blur-md ${className}`}>
      <CardHeader>
        <CardTitle className="chart-card-title text-base">{title}</CardTitle>
        {value && <CardAction className="chart-card-value">{value}</CardAction>}
      </CardHeader>
      <CardContent className="chart-card flex flex-1 flex-col">{children}</CardContent>
    </Card>
  )
}

function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="chart-empty">
      <Mascot pose="thumb" size={72} />
      <span>{children}</span>
    </div>
  )
}

/* ---------- tooltips: values lead, labels follow ---------- */

function TooltipBox({ title, rows, color }: { title: string; rows: [ReactNode, string][]; color: string }) {
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{title}</div>
      {rows.map(([value, label], i) => (
        <div className="tt-row" key={i}>
          {i === 0 && <span className="tt-key" style={{ background: color }} aria-hidden="true" />}
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

interface SeriesProps {
  theme: ChartTheme
  color: string
}

/* ---------- activity: answers per day (single series, columns) ---------- */

function ActivityChart({ points, bucket, theme, color }: SeriesProps & { points: ActivityPoint[]; bucket: 'day' | 'week' }) {
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as ActivityPoint
    return (
      <TooltipBox
        color={color}
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
      <ResponsiveContainer width="100%" height={240}>
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
          <Tooltip content={Content} cursor={{ fill: theme.grid }} isAnimationActive={false} />
          <Bar
            dataKey="answered"
            fill={color}
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

function WordsChart({ points, bucket, theme, color }: SeriesProps & { points: ActivityPoint[]; bucket: 'day' | 'week' }) {
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as ActivityPoint
    return <TooltipBox color={color} title={bucketTitle(p.start, bucket)} rows={[[num(p.words), 'слів у словнику']]} />
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="words-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.35} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="start"
            tickFormatter={(v: number) => dayFmt.format(v)}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={Content} cursor={{ stroke: theme.label2, strokeWidth: 1 }} isAnimationActive={false} />
          <Area
            type="monotone"
            dataKey="words"
            stroke={color}
            strokeWidth={2}
            fill="url(#words-fill)"
            activeDot={{ r: 5, fill: color, stroke: theme.surface, strokeWidth: 2 }}
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

function AttemptsChart({ points, threshold, theme, color }: SeriesProps & { points: AttemptPoint[]; threshold: number }) {
  const Content = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as AttemptPoint
    return (
      <TooltipBox
        color={color}
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
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: `поріг ${threshold}%`, position: 'insideTopRight' }}
          />
          <Tooltip content={Content} cursor={{ stroke: theme.label2, strokeWidth: 1 }} isAnimationActive={false} />
          <Line
            type="linear"
            dataKey="percent"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, stroke: theme.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: theme.surface, strokeWidth: 2 }}
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
        className="meter meter-lime"
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
        <div className="tone-lime">
          <b>{num(correct)}</b>
          <span>правильно</span>
        </div>
        <div className="tone-coral">
          <b>{num(wrong)}</b>
          <span>неправильно</span>
        </div>
        <div className="tone-muted">
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
    <div className="meter-list topic-meters">
      {topics.map((t) => (
        <div className="meter-row" key={t.topic}>
          <span>{t.name}</span>
          <div
            className={`meter ${t.percent >= threshold ? 'meter-lime' : 'meter-coral'}`}
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

// The visually hidden box is a div: a table ignores the 1px size of .sr-only, grows to its rows and
// stretches the page's scroll height.
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="sr-only">
      <table>
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
    </div>
  )
}
