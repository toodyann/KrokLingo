import { WordLookupProvider } from './components/WordLookup'
import { useRoute, type Route } from './lib/router'
import { DictionaryPage } from './pages/DictionaryPage'
import { ExamSetupPage } from './pages/ExamSetupPage'
import { FlashcardsPage } from './pages/FlashcardsPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TestPage } from './pages/TestPage'
import { TrainingSetupPage } from './pages/TrainingSetupPage'
import { AppProvider } from './store/AppStore'
import { useApp } from './store/context'

const NAV: { path: string; label: string; match: Route['name'][] }[] = [
  { path: '', label: 'Головна', match: ['home'] },
  { path: 'exam', label: 'Іспит', match: ['exam'] },
  { path: 'training', label: 'Тренування', match: ['training'] },
  { path: 'dictionary', label: 'Словник', match: ['dictionary', 'flashcards'] },
  { path: 'history', label: 'Прогрес', match: ['history', 'results'] },
  { path: 'settings', label: 'Налаштування', match: ['settings'] },
]

function Header({ route }: { route: Route }) {
  const { dictionary, session } = useApp()
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true">
            K1
          </span>
          KrokLingo
        </a>
        <nav className="nav" aria-label="Основна навігація">
          {session && (
            <a href="#/test" className={route.name === 'test' ? 'active' : ''}>
              ▶ Тест
            </a>
          )}
          {NAV.map((item) => (
            <a
              key={item.path}
              href={`#/${item.path}`}
              className={item.match.includes(route.name) ? 'active' : ''}
            >
              {item.label}
              {item.path === 'dictionary' && dictionary.length > 0 && (
                <span className="badge">{dictionary.length}</span>
              )}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'exam':
      return <ExamSetupPage />
    case 'training':
      return <TrainingSetupPage />
    case 'test':
      return <TestPage />
    case 'results':
      return <ResultsPage id={route.id} />
    case 'history':
      return <HistoryPage />
    case 'dictionary':
      return <DictionaryPage />
    case 'flashcards':
      return <FlashcardsPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <HomePage />
  }
}

function StorageWarning() {
  const { storageError } = useApp()
  if (!storageError) return null
  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="banner banner-warn">
        Не вдалося зберегти дані в пам'ять браузера (можливо, вона заповнена або вимкнена). Зробіть резервну копію в
        налаштуваннях.
      </div>
    </div>
  )
}

function Shell() {
  const route = useRoute()
  return (
    <WordLookupProvider>
      <Header route={route} />
      <StorageWarning />
      <main>
        <Page route={route} />
      </main>
      <footer className="footer">
        KrokLingo — тренажер «Крок 1. Стоматологія» англійською. Дані зберігаються лише у вашому браузері.
      </footer>
    </WordLookupProvider>
  )
}

function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

export default App
