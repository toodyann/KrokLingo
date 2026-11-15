import { useMemo } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { IconGrid, IconHistory, IconTests } from '../components/Icons'
import { LangSwitch } from '../components/LangSwitch'
import { PageHeader } from '../components/PageHeader'
import { discardSessionOptions, useConfirm } from '../components/confirmContext'
import { navigate, link } from '../lib/router'
import { createSession, liveStats, mistakeIds, topicStats } from '../lib/session'
import { formatPercent, pluralUk, shuffle } from '../lib/util'
import { useApp } from '../store/context'

const TOPIC_QUIZ_SIZE = 20

function Fact({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

export function TestsPage() {
  const { bank, settings, history, session, setSession } = useApp()
  const confirm = useConfirm()
  const mistakes = useMemo(() => mistakeIds(history, bank).size, [history, bank])
  const accuracy = useMemo(() => new Map(topicStats(history, bank).map((t) => [t.topic, t])), [history, bank])

  const topics = bank.topics
    .map((t) => ({ ...t, questions: bank.questions.filter((q) => q.topic === t.id) }))
    .filter((t) => t.questions.length > 0)

  const startTopic = async (id: string, name: string) => {
    if (session && !(await confirm(discardSessionOptions('Почати нове тренування?')))) return
    const questions = shuffle(bank.questions.filter((q) => q.topic === id)).slice(0, TOPIC_QUIZ_SIZE)
    setSession(
      createSession({
        mode: 'training',
        title: `Тренування: ${name}`,
        questions,
        timeLimitMin: null,
        instantFeedback: true,
        threshold: settings.threshold,
        topics: [id],
      }),
    )
    navigate('test')
  }

  return (
    <div className="page">
      <PageHeader title="Тести" subtitle={`${bank.questions.length} питань · ${topics.length} тем`} actions={<LangSwitch />} />

      {session && (
        <Alert className="mb-6 has-data-[slot=alert-action]:pr-32">
          <IconTests />
          <AlertTitle>{session.title}</AlertTitle>
          <AlertDescription>
            Відповіли на {liveStats(session, bank).answered} з {session.questions.length}
            {session.deadline ? ' · таймер іде' : ''}
          </AlertDescription>
          <AlertAction>
            <Button asChild size="sm">
              <a href={link('test')}>Продовжити</a>
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="grid grid-2 section">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Симуляція іспиту</CardTitle>
            <CardDescription>
              {bank.lang === 'uk' ? 'Українська версія' : 'Англійська мова професійного спрямування'} з таймером і
              підсумком «склав / не склав».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mode-facts m-0">
              <Fact value={settings.examQuestions} label="завдань" />
              <Fact value={`${settings.examMinutes} хв`} label="таймер" />
              <Fact value={`${settings.threshold}%`} label="поріг" />
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button asChild size="lg">
              <a href={link('exam')}>
                <IconTests />
                Почати іспит
              </a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Вільне тренування</CardTitle>
            <CardDescription>Обирайте збірники й теми, кількість питань і повторюйте помилки — без обмеження часу.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mode-facts m-0">
              <Fact value={bank.collections.length} label={pluralUk(bank.collections.length, 'збірник', 'збірники', 'збірників')} />
              <Fact value={topics.length} label="тем" />
              <Fact value={mistakes} label="з помилками" />
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button asChild size="lg" variant="outline">
              <a href={link('training')}>
                <IconGrid />
                Налаштувати тренування
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Тести за темами</h2>
          {mistakes > 0 && (
            <Button asChild variant="ghost" size="sm">
              <a href={link('training')}>
                <IconHistory />
                Робота над помилками · {mistakes}
              </a>
            </Button>
          )}
        </div>
        <div className="topic-grid">
          {topics.map((t) => {
            const stat = accuracy.get(t.id)
            const pct = stat ? (stat.correct / stat.total) * 100 : null
            const size = Math.min(TOPIC_QUIZ_SIZE, t.questions.length)
            return (
              <button
                key={t.id}
                type="button"
                className="card topic-card"
                onClick={() => startTopic(t.id, t.name)}
                aria-label={`Почати тренування «${t.name}», ${size} питань`}
              >
                <div className="topic-card-head">
                  <span className="topic-card-name">{t.name}</span>
                  <Badge variant="secondary">{t.questions.length}</Badge>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct == null ? 0 : Math.round(pct)}
                  aria-label={pct == null ? 'Ще не проходили' : `Точність ${formatPercent(pct)}`}
                >
                  {pct != null && <div className="meter-fill" style={{ width: `${pct}%` }} />}
                  <span className="meter-limit" style={{ left: `${settings.threshold}%` }} aria-hidden="true" />
                </div>
                <div className="topic-card-meta">
                  <span>{pct == null ? 'Ще не проходили' : `Точність ${formatPercent(pct)}`}</span>
                  <span>
                    {size} {pluralUk(size, 'питання', 'питання', 'питань')} →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
