import { useState } from 'react'
import { navigate } from '../lib/router'
import { createSession } from '../lib/session'
import { shuffle } from '../lib/util'
import { useApp } from '../store/context'

export function ExamSetupPage() {
  const { bank, settings, session, setSession } = useApp()
  const [instantFeedback, setInstantFeedback] = useState(true)
  const count = Math.min(settings.examQuestions, bank.questions.length)

  const start = () => {
    if (session && !confirm('У вас є незавершений тест. Почати новий іспит і скасувати попередній?')) return
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
      <h1>Симуляція іспиту</h1>
      <p className="muted">Англійська мова професійного спрямування · «Крок 1. Стоматологія»</p>

      <div className="card stack">
        <div className="grid grid-4">
          <div className="stat">
            <div className="stat-value">{count}</div>
            <div className="stat-label">тестових завдань</div>
          </div>
          <div className="stat">
            <div className="stat-value">{settings.examMinutes} хв</div>
            <div className="stat-label">зворотний таймер</div>
          </div>
          <div className="stat">
            <div className="stat-value">{settings.threshold}%</div>
            <div className="stat-label">прохідний поріг</div>
          </div>
        </div>

        <ul className="muted" style={{ margin: 0, paddingLeft: 20 }}>
          <li>Питання обираються випадково з усіх тем і збірників, варіанти відповідей перемішуються.</li>
          <li>Коли час вийде, тест завершиться автоматично — питання без відповіді зараховуються як неправильні.</li>
          <li>Натискайте на будь-яке англійське слово, щоб побачити переклад. Слово збережеться у словник.</li>
          <li>Прогрес зберігається: якщо закрити сторінку, тест можна продовжити (таймер не зупиняється).</li>
        </ul>

        <label className="check">
          <input type="checkbox" checked={instantFeedback} onChange={(e) => setInstantFeedback(e.target.checked)} />
          <span>
            <b>Показувати правильність відповіді одразу</b>
            <br />
            <span className="muted small">
              Відповідь фіксується після вибору, а лічильник правильних/неправильних оновлюється наживо. Вимкніть для
              умов, максимально наближених до реального іспиту.
            </span>
          </span>
        </label>

        {count < settings.examQuestions && (
          <div className="banner banner-warn" style={{ margin: 0 }}>
            У базі лише {bank.questions.length} питань — іспит буде коротшим за {settings.examQuestions}.
          </div>
        )}

        <div>
          <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={count === 0}>
            Почати іспит
          </button>
        </div>
      </div>
    </div>
  )
}
