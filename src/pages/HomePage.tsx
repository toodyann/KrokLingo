import { useMemo } from 'react'
import { IconChevronRight } from '../components/Icons'
import { liveStats, mistakeIds } from '../lib/session'
import { formatPercent, pluralUk } from '../lib/util'
import { useApp } from '../store/context'

export function HomePage() {
  const { bank, settings, history, dictionary, session } = useApp()
  const toLearn = dictionary.filter((e) => !e.learned && e.translation).length
  const mistakes = useMemo(() => mistakeIds(history, bank).size, [history, bank])
  const last = history.length ? [...history].sort((a, b) => b.finishedAt - a.finishedAt)[0] : null

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="t-large-title">Тести</h1>
        </div>
      </header>

      {session && (
        <div className="banner">
          <div className="list-row-main">
            <div className="t-headline">{session.title}</div>
            <div className="secondary t-subhead">
              Відповіли на {liveStats(session, bank).answered} з {session.questions.length}
              {session.deadline ? ' · таймер іде' : ''}
            </div>
          </div>
          <a className="btn btn-primary btn-sm" href="#/test">
            Продовжити
          </a>
        </div>
      )}

      <div className="grid grid-2 section">
        <section className="card mode-card">
          <h2 className="t-title2">Симуляція іспиту</h2>
          <div className="facts">
            <span className="pill">{settings.examQuestions} завдань</span>
            <span className="pill">{settings.examMinutes} хв</span>
            <span className="pill">поріг {settings.threshold}%</span>
          </div>
          <a className="btn btn-primary" href="#/exam">
            Почати іспит
          </a>
        </section>
        <section className="card mode-card">
          <h2 className="t-title2">Тренування</h2>
          <div className="facts">
            <span className="pill">без таймера</span>
            <span className="pill">{bank.topics.length} тем</span>
            <span className="pill">{bank.questions.length} питань</span>
          </div>
          <a className="btn btn-tinted" href="#/training">
            Налаштувати
          </a>
        </section>
      </div>

      <section className="section">
        <h2 className="section-title">Що далі</h2>
        <div className="list">
          <a className="list-row" href="#/flashcards">
            <div className="list-row-main">Повторити слова картками</div>
            <span className="list-row-value">
              {toLearn} {pluralUk(toLearn, 'слово', 'слова', 'слів')}
            </span>
            <IconChevronRight className="chev" />
          </a>
          <a className="list-row" href="#/training">
            <div className="list-row-main">Робота над помилками</div>
            <span className="list-row-value">
              {mistakes} {pluralUk(mistakes, 'питання', 'питання', 'питань')}
            </span>
            <IconChevronRight className="chev" />
          </a>
          <a className="list-row" href={last ? `#/results/${last.id}` : '#/history'}>
            <div className="list-row-main">Останній результат</div>
            <span className="list-row-value">{last ? formatPercent(last.percent) : 'ще немає'}</span>
            <IconChevronRight className="chev" />
          </a>
        </div>
      </section>
    </div>
  )
}
