import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { navigate } from '../lib/router'
import { createSession } from '../lib/session'
import { shuffle } from '../lib/util'
import { useApp } from '../store/context'

export function ExamSetupPage() {
  const { bank, settings, session, setSession } = useApp()
  const [instantFeedback, setInstantFeedback] = useState(true)
  const count = Math.min(settings.examQuestions, bank.questions.length)

  const start = () => {
    if (session && !confirm('Незавершений тест буде скасовано, а його відповіді втрачено. Почати новий іспит?')) return
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
    <div className="page page-narrow">
      <PageHeader
        back={{ href: '#/', label: 'Тести' }}
        title="Симуляція іспиту"
        subtitle="Англійська мова професійного спрямування · «Крок 1. Стоматологія»"
      />

      <section className="section">
        <div className="list">
          <div className="list-row">
            <div className="list-row-main">Тестових завдань</div>
            <span className="list-row-value">{count}</span>
          </div>
          <div className="list-row">
            <div className="list-row-main">Зворотний таймер</div>
            <span className="list-row-value">{settings.examMinutes} хв</span>
          </div>
          <div className="list-row">
            <div className="list-row-main">Прохідний поріг</div>
            <span className="list-row-value">{settings.threshold}% правильних</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="list">
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <div className="list-row-main">Показувати правильність одразу</div>
            <input
              type="checkbox"
              className="switch"
              checked={instantFeedback}
              onChange={(e) => setInstantFeedback(e.target.checked)}
            />
          </label>
        </div>
      </section>

      {count < settings.examQuestions && (
        <div className="banner banner-warn">
          У базі лише {bank.questions.length} питань, тому іспит буде коротшим за {settings.examQuestions}.
        </div>
      )}

      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={start} disabled={count === 0}>
        Почати іспит
      </button>
    </div>
  )
}
