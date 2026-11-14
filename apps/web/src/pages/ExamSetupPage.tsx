import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '../components/PageHeader'
import { discardSessionOptions, useConfirm } from '../components/confirmContext'
import { navigate, link } from '../lib/router'
import { createSession } from '../lib/session'
import { shuffle } from '../lib/util'
import { useApp } from '../store/context'

export function ExamSetupPage() {
  const { bank, settings, session, setSession } = useApp()
  const confirm = useConfirm()
  const [instantFeedback, setInstantFeedback] = useState(true)
  const count = Math.min(settings.examQuestions, bank.questions.length)
  const topicCount = new Set(bank.questions.map((q) => q.topic)).size

  const start = async () => {
    if (session && !(await confirm(discardSessionOptions('Почати новий іспит?')))) return
    const questions = shuffle(bank.questions).slice(0, count)
    setSession(
      createSession({
        mode: 'exam',
        title: 'Симуляція іспиту',
        questions,
        timeLimitMin: settings.examMinutes,
        instantFeedback,
        threshold: settings.threshold,
        topics: [...new Set(questions.map((q) => q.topic))],
      }),
    )
    navigate('test')
  }

  return (
    <div className="page">
      <PageHeader
        back={{ href: link('tests'), label: 'Тести' }}
        title="Симуляція іспиту"
        subtitle="Англійська мова професійного спрямування · «Крок 1. Стоматологія»"
      />

      <div className="split">
        <div className="stack" style={{ gap: 'var(--gap)' }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Формат</CardTitle>
              <CardDescription>Питання з усіх {topicCount} тем, варіанти відповідей перемішуються.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mode-facts m-0">
                <div>
                  <b>{count}</b>
                  <span>тестових завдань</span>
                </div>
                <div>
                  <b>{settings.examMinutes} хв</b>
                  <span>зворотний таймер</span>
                </div>
                <div>
                  <b>{settings.threshold}%</b>
                  <span>прохідний поріг</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Параметри</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="exam-instant">Показувати правильність одразу</Label>
                  <p className="text-sm text-muted-foreground">Вимкніть для умов, як на справжньому іспиті</p>
                </div>
                <Switch id="exam-instant" checked={instantFeedback} onCheckedChange={setInstantFeedback} />
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Питання без відповіді зараховується як неправильне. Якщо закрити сторінку, тест можна продовжити — таймер
                не зупиняється.
              </p>
            </CardContent>
          </Card>

          {count < settings.examQuestions && (
            <Alert>
              <AlertDescription>
                У базі лише {bank.questions.length} питань, тому іспит буде коротшим за {settings.examQuestions}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <aside className="split-aside">
          <Card>
            <CardContent className="summary-card">
              <div>
                <div className="text-sm text-muted-foreground">Тривалість</div>
                <div className="summary-figure">{settings.examMinutes} хв</div>
              </div>
              <div className="summary-rows">
                <div>
                  <span>Завдань</span>
                  <b>{count}</b>
                </div>
                <div>
                  <span>Поріг</span>
                  <b>{settings.threshold}%</b>
                </div>
                <div>
                  <span>Відповідь</span>
                  <b>{instantFeedback ? 'одразу' : 'наприкінці'}</b>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={start} disabled={count === 0}>
                Почати іспит
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
