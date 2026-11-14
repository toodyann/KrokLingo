import { ProgressChart } from '../components/Charts'
import { liveStats } from '../lib/session'
import { formatPercent } from '../lib/util'
import { useApp } from '../store/context'

export function HomePage() {
  const { bank, settings, history, dictionary, session } = useApp()
  const exams = history.filter((r) => r.mode === 'exam')
  const avg = history.length ? history.reduce((s, r) => s + r.percent, 0) / history.length : 0
  const best = history.length ? Math.max(...history.map((r) => r.percent)) : 0
  const passedExams = exams.filter((r) => r.passed).length
  const toLearn = dictionary.filter((e) => !e.learned).length

  return (
    <div className="page">
      <section className="hero">
        <h1>Підготовка до «Крок 1. Стоматологія» англійською</h1>
        <p>
          Симуляція іспиту з таймером, вільне тренування за темами та словник невідомих слів: натисніть на будь-яке
          англійське слово в тесті, щоб побачити переклад, і воно збережеться у ваш словник.
        </p>
      </section>

      {session && (
        <div className="banner">
          <div>
            <b>Незавершений тест:</b> {session.title} · відповіли на {liveStats(session, bank).answered} з{' '}
            {session.questions.length}
          </div>
          <span className="spacer" />
          <a className="btn btn-primary btn-sm" href="#/test">
            Продовжити
          </a>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card mode-card">
          <h2>Симуляція іспиту</h2>
          <div className="facts">
            <span className="badge badge-accent">{settings.examQuestions} завдань</span>
            <span className="badge badge-accent">{settings.examMinutes} хвилин</span>
            <span className="badge badge-accent">поріг {settings.threshold}%</span>
          </div>
          <p className="muted">
            Повноцінний іспит з англійської мови професійного спрямування зі зворотним таймером і підсумковим звітом
            «склав / не склав».
          </p>
          <a className="btn btn-primary" href="#/exam">
            Почати іспит
          </a>
        </div>
        <div className="card mode-card">
          <h2>Вільне тренування</h2>
          <div className="facts">
            <span className="badge">без обмеження часу</span>
            <span className="badge">{bank.topics.length} тем</span>
            <span className="badge">{bank.questions.length} питань</span>
          </div>
          <p className="muted">
            Оберіть окремі теми чи збірники, кількість питань і тренуйтеся у своєму темпі. Можна повторити лише ті
            питання, де були помилки.
          </p>
          <a className="btn btn-secondary" href="#/training">
            Налаштувати тренування
          </a>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-value">{history.length}</div>
          <div className="stat-label">спроб усього</div>
        </div>
        <div className="stat">
          <div className="stat-value">{history.length ? formatPercent(avg) : '—'}</div>
          <div className="stat-label">середній результат</div>
        </div>
        <div className="stat">
          <div className="stat-value">{history.length ? formatPercent(best) : '—'}</div>
          <div className="stat-label">найкращий результат</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {passedExams}/{exams.length}
          </div>
          <div className="stat-label">іспитів складено</div>
        </div>
        <a className="stat" href="#/dictionary" style={{ textDecoration: 'none' }}>
          <div className="stat-value">{dictionary.length}</div>
          <div className="stat-label">слів у словнику · {toLearn} до вивчення</div>
        </a>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Шкала прогресу</h2>
          <a href="#/history" className="btn btn-ghost btn-sm">
            Уся історія →
          </a>
        </div>
        <ProgressChart records={history} threshold={settings.threshold} />
      </div>
    </div>
  )
}
