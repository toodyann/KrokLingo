import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight, IconClose, IconGrid } from '../components/Icons'
import { QuestionView } from '../components/QuestionView'
import { useDraggableSheet } from '../components/useDraggableSheet'
import { useNow } from '../lib/hooks'
import { navigate } from '../lib/router'
import { finalizeSession, liveStats } from '../lib/session'
import { formatClock, formatPercent, LETTERS, pluralUk } from '../lib/util'
import { useApp, type Bank } from '../store/context'
import type { ActiveSession } from '../types'

export function TestPage() {
  const { bank, session, setSession, addAttempt, dictionary } = useApp()
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
      setSession((prev) => (prev ? { ...prev, current: Math.max(0, Math.min(index, prev.questions.length - 1)) } : prev)),
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
      <div className="page page-narrow">
        <div className="card empty">
          <h2 className="t-title3">Немає активного тесту</h2>
          <p style={{ marginBottom: 16 }}>Почніть симуляцію іспиту або тренування.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn btn-primary" href="#/exam">
              Іспит
            </a>
            <a className="btn btn-tinted" href="#/training">
              Тренування
            </a>
          </div>
        </div>
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

  const askFinish = () => {
    if (
      left === 0 ||
      confirm(
        `${left} ${pluralUk(left, 'питання залишилось', 'питання залишились', 'питань залишились')} без відповіді — їх буде зараховано як неправильні. Завершити тест?`,
      )
    ) {
      finish(false)
    }
  }

  const abandon = () => {
    if (confirm('Вийти з тесту без збереження результату? Відповіді буде втрачено.')) {
      setSession(null)
      navigate('tests')
    }
  }

  return (
    <>
      <div className="test-bar material">
        <div className="test-bar-inner">
          <div className="left">
            <button type="button" className="icon-btn" onClick={abandon} aria-label="Вийти з тесту без збереження">
              <IconClose />
            </button>
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
            <button type="button" className="btn btn-primary btn-sm" onClick={askFinish}>
              Завершити
            </button>
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
              <span className="pill pill-accent">{session.mode === 'exam' ? 'Іспит' : 'Тренування'}</span>
              {question && <span className="pill">{bank.topicName(question.topic)}</span>}
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
              <button type="button" className="btn btn-gray" onClick={() => go(session.current - 1)} disabled={isFirst}>
                <IconChevronLeft />
                Назад
              </button>
              {isLast ? (
                <button type="button" className="btn btn-primary" onClick={askFinish}>
                  Завершити тест
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => go(session.current + 1)}>
                  Далі
                  <IconChevronRight />
                </button>
              )}
            </div>
          </div>

          <aside className="card">
            <h2 className="t-headline" style={{ marginBottom: 12 }}>
              Питання
            </h2>
            <Palette session={session} bank={bank} onGo={go} />
          </aside>
        </div>
      </div>

      <div className="bottom-toolbar material">
        <button
          type="button"
          className="icon-btn"
          onClick={() => go(session.current - 1)}
          disabled={isFirst}
          aria-label="Попереднє питання"
        >
          <IconChevronLeft />
        </button>
        <button type="button" className="btn btn-gray" onClick={() => setPaletteOpen(true)} aria-label="Усі питання">
          <IconGrid />
          <span className="tnum">
            {session.current + 1} / {stats.total}
          </span>
        </button>
        {isLast ? (
          <button type="button" className="btn btn-primary" onClick={askFinish}>
            Завершити
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => go(session.current + 1)}>
            Далі
            <IconChevronRight />
          </button>
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
              <i style={{ background: 'var(--success-tint)' }} />
              правильно
            </span>
            <span>
              <i style={{ background: 'var(--danger-tint)' }} />
              <s>неправильно</s>
            </span>
          </>
        ) : (
          <span>
            <i style={{ background: 'var(--accent-tint)' }} />є відповідь
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
          <button type="button" className="icon-btn filled" onClick={() => dismiss()} aria-label="Закрити">
            <IconClose size={16} />
          </button>
        </div>
        {children(() => dismiss())}
      </div>
    </>,
    document.body,
  )
}
