import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '../components/confirmContext'
import { EmptyState } from '../components/EmptyState'
import { IconChevronLeft, IconChevronRight, IconClose, IconGrid, IconTests } from '../components/Icons'
import { QuestionView } from '../components/QuestionView'
import { useDraggableSheet } from '../components/useDraggableSheet'
import { useNow } from '../lib/hooks'
import { navigate, link } from '../lib/router'
import { finalizeSession, liveStats } from '../lib/session'
import { formatClock, formatPercent, LETTERS, pluralUk } from '../lib/util'
import { useApp, type Bank } from '../store/context'
import type { ActiveSession } from '../types'

export function TestPage() {
  const { bank, session, setSession, addAttempt, dictionary } = useApp()
  const confirm = useConfirm()
  const now = useNow(1000, session != null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Latest values for callbacks that must not go stale (timer, keyboard).
  const latest = useRef({ session, dictionary })
  useLayoutEffect(() => {
    latest.current = { session, dictionary }
  })
  const finishing = useRef(false)

  const finish = useCallback(
    (timedOut: boolean) => {
      const { session: s, dictionary: dict } = latest.current
      if (!s || finishing.current) return
      finishing.current = true
      const record = finalizeSession(s, bank, dict, timedOut)
      addAttempt(record)
      setSession(null)
      navigate(`results/${record.id}`)
    },
    [bank, addAttempt, setSession],
  )

  const remaining = session?.deadline ? Math.ceil((session.deadline - now) / 1000) : null

  useEffect(() => {
    if (remaining !== null && remaining <= 0) finish(true)
  }, [remaining, finish])

  const go = useCallback(
    (index: number) =>
      setSession((prev) =>
        prev ? { ...prev, current: Math.max(0, Math.min(index, prev.questions.length - 1)) } : prev,
      ),
    [setSession],
  )

  const choose = useCallback(
    (original: number) =>
      setSession((prev) => {
        if (!prev) return prev
        const i = prev.current
        if (prev.instantFeedback && prev.answers[i] != null) return prev
        const answers = prev.answers.slice()
        answers[i] = original
        return { ...prev, answers }
      }),
    [setSession],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = latest.current.session
      if (!s || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight') go(s.current + 1)
      else if (e.key === 'ArrowLeft') go(s.current - 1)
      else {
        const sq = s.questions[s.current]
        const byNumber = Number(e.key) - 1
        const byLetter = LETTERS.indexOf(e.key.toUpperCase())
        const idx = e.key.length === 1 && byNumber >= 0 && byNumber < 9 ? byNumber : byLetter
        if (idx >= 0 && idx < sq.order.length) choose(sq.order[idx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, choose])

  // Each question starts at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [session?.current])

  if (!session) {
    return (
      <div className="page">
        <EmptyState
          icon={<IconTests />}
          title="Немає активного тесту"
          actions={
            <>
              <Button asChild>
                <a href={link('exam')}>Почати іспит</a>
              </Button>
              <Button asChild variant="outline">
                <a href={link('training')}>Тренування</a>
              </Button>
            </>
          }
        >
          Почніть симуляцію іспиту або тренування за темами.
        </EmptyState>
      </div>
    )
  }

  const stats = liveStats(session, bank)
  const sq = session.questions[session.current]
  const question = bank.questionById.get(sq.qid)
  const chosen = session.answers[session.current]
  const reveal = session.instantFeedback && chosen != null
  const elapsed = Math.floor((now - session.startedAt) / 1000)
  const isFirst = session.current === 0
  const isLast = session.current === session.questions.length - 1
  const left = stats.total - stats.answered

  const askFinish = async () => {
    if (
      left === 0 ||
      (await confirm({
        title: 'Завершити тест?',
        description: `${left} ${pluralUk(left, 'питання залишилось', 'питання залишились', 'питань залишились')} без відповіді — їх буде зараховано як неправильні.`,
        confirmLabel: 'Завершити',
        cancelLabel: 'Продовжити тест',
      }))
    ) {
      finish(false)
    }
  }

  const abandon = async () => {
    const ok = await confirm({
      title: 'Вийти без збереження?',
      description: 'Результат не буде збережено, а відповіді цього тесту буде втрачено.',
      confirmLabel: 'Вийти',
      cancelLabel: 'Залишитися',
      destructive: true,
    })
    if (ok) {
      setSession(null)
      navigate('tests')
    }
  }

  return (
    <>
      <div className="test-bar material">
        <div className="test-bar-inner">
          <div className="left">
            <Button variant="ghost" size="icon" onClick={abandon} aria-label="Вийти з тесту без збереження">
              <IconClose />
            </Button>
            <span className="secondary t-subhead regular-only">{session.title}</span>
          </div>
          {remaining !== null ? (
            <div className={`timer${remaining < 300 ? ' low' : ''}`} role="timer" aria-label="Залишилось часу">
              <div className="timer-value">{formatClock(remaining)}</div>
              <div className="timer-label">залишилось</div>
            </div>
          ) : (
            <div className="timer" role="timer" aria-label="Минуло часу">
              <div className="timer-value">{formatClock(elapsed)}</div>
              <div className="timer-label">минуло</div>
            </div>
          )}
          <div className="right">
            <Button onClick={askFinish}>Завершити</Button>
          </div>
        </div>
        <div className="test-stats" aria-live="polite">
          <span>
            Питання <b>{session.current + 1}</b> з {stats.total}
          </span>
          {session.instantFeedback ? (
            <>
              <span className="ok">✓ {stats.correct}</span>
              <span className="bad">✗ {stats.wrong}</span>
              <span className="secondary">{stats.answered ? formatPercent(stats.percent) : '—'} правильних</span>
            </>
          ) : (
            <span className="secondary">Відповідей: {stats.answered}</span>
          )}
        </div>
        <div className="progress" aria-hidden="true">
          <div style={{ width: `${(stats.answered / stats.total) * 100}%` }} />
        </div>
      </div>

      <div className="page test-page">
        <div className="runner">
          <div>
            <div className="question-meta">
              <Badge variant="brand">{session.mode === 'exam' ? 'Іспит' : 'Тренування'}</Badge>
              {question && <Badge variant="secondary">{bank.topicName(question.topic)}</Badge>}
            </div>

            {question ? (
              <QuestionView
                key={sq.qid}
                question={question}
                order={sq.order}
                chosen={chosen}
                reveal={reveal}
                onChoose={reveal ? undefined : choose}
              />
            ) : (
              <p className="secondary">Це питання видалене з бази (імпортований збірник). Перейдіть до наступного.</p>
            )}

            <div className="runner-nav">
              <Button variant="outline" size="lg" onClick={() => go(session.current - 1)} disabled={isFirst}>
                <IconChevronLeft />
                Назад
              </Button>
              {isLast ? (
                <Button size="lg" onClick={askFinish}>
                  Завершити тест
                </Button>
              ) : (
                <Button size="lg" onClick={() => go(session.current + 1)}>
                  Далі
                  <IconChevronRight />
                </Button>
              )}
            </div>
          </div>

          <aside className="card p-5">
            <h2 className="card-title" style={{ marginBottom: 12 }}>
              Питання
            </h2>
            <Palette session={session} bank={bank} onGo={go} />
          </aside>
        </div>
      </div>

      <div className="bottom-toolbar material">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => go(session.current - 1)}
          disabled={isFirst}
          aria-label="Попереднє питання"
        >
          <IconChevronLeft />
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setPaletteOpen(true)} aria-label="Усі питання">
          <IconGrid />
          <span className="tnum">
            {session.current + 1} / {stats.total}
          </span>
        </Button>
        {isLast ? (
          <Button className="flex-1" onClick={askFinish}>
            Завершити
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => go(session.current + 1)}>
            Далі
            <IconChevronRight />
          </Button>
        )}
      </div>

      {paletteOpen && (
        <PaletteSheet onClose={() => setPaletteOpen(false)}>
          {(dismiss) => (
            <Palette
              session={session}
              bank={bank}
              onGo={(i) => {
                go(i)
                dismiss()
              }}
            />
          )}
        </PaletteSheet>
      )}
    </>
  )
}

function Palette({ session, bank, onGo }: { session: ActiveSession; bank: Bank; onGo: (i: number) => void }) {
  return (
    <>
      <div className="palette">
        {session.questions.map((q, i) => {
          const a = session.answers[i]
          let cls = ''
          let state = 'без відповіді'
          if (a != null) {
            if (session.instantFeedback) {
              const ok = bank.questionById.get(q.qid)?.correct === a
              cls = ok ? 'ok' : 'bad'
              state = ok ? 'правильно' : 'неправильно'
            } else {
              cls = 'answered'
              state = 'є відповідь'
            }
          }
          const current = i === session.current
          if (current) cls += ' current'
          return (
            <button
              key={q.qid + i}
              type="button"
              className={cls}
              onClick={() => onGo(i)}
              aria-label={`Питання ${i + 1}: ${state}`}
              aria-current={current ? 'step' : undefined}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="legend">
        {session.instantFeedback ? (
          <>
            <span>
              <i style={{ background: 'var(--success-soft)' }} />
              правильно
            </span>
            <span>
              <i style={{ background: 'var(--danger-soft)' }} />
              <s>неправильно</s>
            </span>
          </>
        ) : (
          <span>
            <i style={{ background: 'var(--brand-soft)' }} />є відповідь
          </span>
        )}
        <span>
          <i />
          без відповіді
        </span>
      </div>
    </>
  )
}

/** Modal sheet: dims the test behind it, swipe down or tap outside to close. */
function PaletteSheet({ onClose, children }: { onClose: () => void; children: (dismiss: () => void) => ReactNode }) {
  const { ref, dismiss, handlers } = useDraggableSheet(onClose)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismiss])

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={() => dismiss()} aria-hidden="true" />
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label="Усі питання" {...handlers}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="t-headline">Усі питання</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => dismiss()} aria-label="Закрити">
            <IconClose size={16} />
          </Button>
        </div>
        {children(() => dismiss())}
      </div>
    </>,
    document.body,
  )
}
