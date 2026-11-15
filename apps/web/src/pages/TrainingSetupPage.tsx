import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PageHeader } from '../components/PageHeader'
import { discardSessionOptions, useConfirm } from '../components/confirmContext'
import { Segmented } from '../components/Segmented'
import { navigate, link } from '../lib/router'
import { createSession, mistakeIds } from '../lib/session'
import { pluralUk, shuffle } from '../lib/util'
import { useApp } from '../store/context'

const COUNTS = [10, 20, 30, 50, 0] as const

export function TrainingSetupPage() {
  const { bank, settings, history, session, setSession } = useApp()
  const confirm = useConfirm()
  const [collections, setCollections] = useState<string[]>(() => bank.collections.map((c) => c.id))
  const [topics, setTopics] = useState<string[]>(() => bank.topics.map((t) => t.id))
  const [count, setCount] = useState<(typeof COUNTS)[number]>(20)
  const [onlyMistakes, setOnlyMistakes] = useState(false)
  const [instantFeedback, setInstantFeedback] = useState(true)

  const mistakes = useMemo(() => mistakeIds(history, bank), [history, bank])

  const inCollections = useMemo(
    () => bank.questions.filter((q) => collections.includes(q.collection)),
    [bank.questions, collections],
  )
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const q of inCollections) m.set(q.topic, (m.get(q.topic) ?? 0) + 1)
    return m
  }, [inCollections])

  const pool = inCollections.filter((q) => topics.includes(q.topic) && (!onlyMistakes || mistakes.has(q.id)))
  const finalCount = count === 0 ? pool.length : Math.min(count, pool.length)

  const start = async () => {
    if (session && !(await confirm(discardSessionOptions('Почати тренування?')))) return
    const questions = shuffle(pool).slice(0, finalCount)
    const topicNames = [...new Set(questions.map((q) => q.topic))]
    setSession(
      createSession({
        mode: 'training',
        title:
          topicNames.length === 1
            ? `Тренування: ${bank.topicName(topicNames[0])}`
            : onlyMistakes
              ? 'Робота над помилками'
              : 'Тренування',
        questions,
        timeLimitMin: null,
        instantFeedback,
        threshold: settings.threshold,
        topics: topicNames,
      }),
    )
    navigate('test')
  }

  return (
    <div className="page">
      <PageHeader back={{ href: link('tests'), label: 'Тести' }} title="Тренування" />

      <div className="split">
        <Card>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <h2 className="text-base font-semibold">Збірники</h2>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={2}
                value={collections}
                onValueChange={setCollections}
                className="flex-wrap justify-start"
                aria-label="Збірники"
              >
                {bank.collections.map((c) => (
                  <ToggleGroupItem key={c.id} value={c.id} title={c.description} className="data-[state=on]:border-transparent data-[state=on]:bg-brand data-[state=on]:text-[var(--ink)] data-[state=on]:hover:bg-brand/90 data-[state=on]:hover:text-[var(--ink)]">
                    {c.name}
                    <span className="text-xs text-muted-foreground in-data-[state=on]:text-[var(--ink)]/70">{bank.questions.filter((q) => q.collection === c.id).length}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Теми</h2>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setTopics(bank.topics.map((t) => t.id))}>
                    Усі
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setTopics([])}>
                    Жодної
                  </Button>
                </div>
              </div>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={2}
                value={topics}
                onValueChange={setTopics}
                className="flex-wrap justify-start"
                aria-label="Теми"
              >
                {bank.topics
                  .filter((t) => topicCounts.has(t.id))
                  .map((t) => (
                    <ToggleGroupItem key={t.id} value={t.id} className="data-[state=on]:border-transparent data-[state=on]:bg-brand data-[state=on]:text-[var(--ink)] data-[state=on]:hover:bg-brand/90 data-[state=on]:hover:text-[var(--ink)]">
                      {t.name}
                      <span className="text-xs text-muted-foreground in-data-[state=on]:text-[var(--ink)]/70">{topicCounts.get(t.id)}</span>
                    </ToggleGroupItem>
                  ))}
              </ToggleGroup>
            </div>

            <Separator />

            <div className="grid gap-3">
              <h2 className="text-base font-semibold">Кількість питань</h2>
              <Segmented
                value={count}
                onChange={setCount}
                options={COUNTS.map((n) => [n, n === 0 ? 'Усі' : String(n)] as const)}
                label="Кількість питань"
              />
            </div>

            <Separator />

            <div className="grid gap-4">
              <h2 className="text-base font-semibold">Параметри</h2>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="only-mistakes" className="flex-1">
                  Лише питання з помилками
                  <Badge variant="secondary">{mistakes.size}</Badge>
                </Label>
                <Switch id="only-mistakes" checked={onlyMistakes} onCheckedChange={setOnlyMistakes} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="instant" className="flex-1">
                  Показувати відповідь і пояснення одразу
                </Label>
                <Switch id="instant" checked={instantFeedback} onCheckedChange={setInstantFeedback} />
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="split-aside">
          <Card>
            <CardContent className="summary-card">
              <div>
                <div className="text-sm text-muted-foreground">Буде питань</div>
                <div className="summary-figure">{finalCount}</div>
              </div>
              <div className="summary-rows">
                <div>
                  <span>Доступно за фільтрами</span>
                  <b>{pool.length}</b>
                </div>
                <div>
                  <span>Обрано тем</span>
                  <b>
                    {topics.filter((t) => topicCounts.has(t)).length} з {topicCounts.size}
                  </b>
                </div>
                <div>
                  <span>Відповідь</span>
                  <b>{instantFeedback ? 'одразу' : 'наприкінці'}</b>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={start} disabled={finalCount === 0}>
                {finalCount > 0
                  ? `Почати · ${finalCount} ${pluralUk(finalCount, 'питання', 'питання', 'питань')}`
                  : 'Немає питань для цих умов'}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
