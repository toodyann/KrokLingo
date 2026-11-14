import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { QuestionView } from '../components/QuestionView'
import { useNow } from '../lib/hooks'
import { navigate } from '../lib/router'
import { finalizeSession, liveStats } from '../lib/session'
import { formatClock, formatPercent, LETTERS } from '../lib/util'
import { useApp } from '../store/context'

export function TestPage() {
  const { bank, session, setSession, addAttempt, dictionary } = useApp()
  const now = useNow(1000, session != null)

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

  if (!session) {
    return (
      <div className="page page-narrow">
        <div className="card empty">
          <h2>Немає активного тесту</h2>
          <p>Почніть симуляцію іспиту або тренування.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn btn-primary" href="#/exam">
              Іспит
            </a>
            <a className="btn btn-secondary" href="#/training">
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
  const isLast = session.current === session.questions.length - 1

  const askFinish = () => {
    const left = stats.total - stats.answered
    const msg =
      left > 0
        ? `Без відповіді залишилось ${left} питань — вони будуть зараховані як неправильні. Завершити тест?`
        : 'Завершити тест і переглянути результати?'
    if (confirm(msg)) finish(false)
  }

  const abandon = () => {
    if (confirm('Скасувати тест без збереження результату?')) {
      setSession(null)
      navigate('')
    }
  }

  return (
    <div className="page">
      <div className="statsbar" aria-live="polite">
        {remaining !== null ? (
          <div className={`sb-item timer${remaining < 300 ? ' low' : ''}`}>
            <span className="sb-value">{formatClock(remaining)}</span>
            <span className="sb-label">залишилось</span>
          </div>
        ) : (
          <div className="sb-item">
            <span className="sb-value">{formatClock(elapsed)}</span>
            <span className="sb-label">минуло</span>
          </div>
        )}
        <div className="sb-item">
          <span className="sb-value">
            {session.current + 1} / {stats.total}
          </span>
          <span className="sb-label">питання</span>
        </div>
        {session.instantFeedback ? (
          <>
            <div className="sb-item sb-ok">
              <span className="sb-value">✓ {stats.correct}</span>
              <span className="sb-label">правильно</span>
            </div>
            <div className="sb-item sb-bad">
              <span className="sb-value">✗ {stats.wrong}</span>
              <span className="sb-label">неправильно</span>
            </div>
            <div className="sb-item">
              <span className="sb-value">{stats.answered ? formatPercent(stats.percent) : '—'}</span>
              <span className="sb-label">поточний відсоток</span>
            </div>
          </>
        ) : (
          <div className="sb-item">
            <span className="sb-value">{stats.answered}</span>
            <span className="sb-label">відповідей (результат — наприкінці)</span>
          </div>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-primary btn-sm" onClick={askFinish}>
          Завершити
        </button>
        <div className="progress" aria-hidden="true">
          <div style={{ width: `${(stats.answered / stats.total) * 100}%` }} />
        </div>
      </div>

      <div className="runner">
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="badge badge-accent">{session.mode === 'exam' ? 'Іспит' : 'Тренування'}</span>
            {question && <span className="badge">{bank.topicName(question.topic)}</span>}
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
            <p className="muted">Це питання було видалене з бази (імпортований збірник). Перейдіть до наступного.</p>
          )}

          <div className="runner-nav">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => go(session.current - 1)}
              disabled={session.current === 0}
            >
              ← Назад
            </button>
            {isLast ? (
              <button type="button" className="btn btn-primary" onClick={askFinish}>
                Завершити тест
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => go(session.current + 1)}>
                Далі →
              </button>
            )}
          </div>

          <p className="hint">
            Натисніть на літеру або порожнє місце варіанта, щоб обрати відповідь, і на будь-яке слово — щоб перекласти
            його. Клавіші: <kbd>A</kbd>–<kbd>E</kbd> або <kbd>1</kbd>–<kbd>5</kbd> — відповідь, <kbd>←</kbd>{' '}
            <kbd>→</kbd> — навігація.
          </p>
        </div>

        <aside className="card">
          <h3>Питання</h3>
          <div className="palette">
            {session.questions.map((q, i) => {
              const a = session.answers[i]
              let cls = ''
              if (a != null) {
                if (session.instantFeedback) cls = bank.questionById.get(q.qid)?.correct === a ? 'ok' : 'bad'
                else cls = 'answered'
              }
              if (i === session.current) cls += ' current'
              return (
                <button key={q.qid + i} type="button" className={cls} onClick={() => go(i)} aria-label={`Питання ${i + 1}`}>
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="legend">
            {session.instantFeedback ? (
              <>
                <span>
                  <i style={{ background: 'var(--ok-soft)', borderColor: 'var(--ok)' }} />
                  правильно
                </span>
                <span>
                  <i style={{ background: 'var(--bad-soft)', borderColor: 'var(--bad)' }} />
                  неправильно
                </span>
              </>
            ) : (
              <span>
                <i style={{ background: 'var(--accent-soft)' }} />
                є відповідь
              </span>
            )}
            <span>
              <i />
              без відповіді
            </span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={abandon}>
            Скасувати тест
          </button>
        </aside>
      </div>
    </div>
  )
}
