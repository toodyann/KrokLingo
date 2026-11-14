import type { ComponentType } from 'react'
import { IconBook, IconChart, IconGear, IconTests } from './components/Icons'
import { ToastProvider } from './components/Toast'
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

interface Tab {
  path: string
  label: string
  Icon: ComponentType<{ size?: number }>
  routes: Route['name'][]
}

// Four top-level sections, named for what they contain.
const TABS: Tab[] = [
  { path: '', label: 'Тести', Icon: IconTests, routes: ['home', 'exam', 'training', 'test'] },
  { path: 'dictionary', label: 'Словник', Icon: IconBook, routes: ['dictionary', 'flashcards'] },
  { path: 'history', label: 'Прогрес', Icon: IconChart, routes: ['history', 'results'] },
  { path: 'settings', label: 'Налаштування', Icon: IconGear, routes: ['settings'] },
]

function DictionaryBadge() {
  const { dictionary } = useApp()
  const toLearn = dictionary.filter((e) => !e.learned).length
  return toLearn > 0 ? <span className="tab-badge">{toLearn > 99 ? '99+' : toLearn}</span> : null
}

function AppBar({ route }: { route: Route }) {
  return (
    <header className="app-bar material">
      <div className="app-bar-inner">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true">
            K1
          </span>
          KrokLingo
        </a>
        <nav className="top-tabs" aria-label="Розділи">
          {TABS.map(({ path, label, Icon, routes }) => (
            <a
              key={path}
              className="top-tab"
              href={`#/${path}`}
              aria-current={routes.includes(route.name) ? 'page' : undefined}
            >
              <Icon />
              {label}
              {path === 'dictionary' && <DictionaryBadge />}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}

function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tab-bar material" aria-label="Розділи">
      <div className="tab-bar-inner">
        {TABS.map(({ path, label, Icon, routes }) => (
          <a
            key={path}
            className="tab"
            href={`#/${path}`}
            aria-current={routes.includes(route.name) ? 'page' : undefined}
          >
            <Icon />
            {label}
            {path === 'dictionary' && <DictionaryBadge />}
          </a>
        ))}
      </div>
    </nav>
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
        Не вдалося зберегти дані в пам'ять браузера (можливо, вона заповнена або вимкнена). Збережіть резервну
        копію в налаштуваннях.
      </div>
    </div>
  )
}

function Shell() {
  const route = useRoute()
  // A running test is a focused, modal task: no tab bar, its own toolbar with a clear way out.
  const inTest = route.name === 'test'
  return (
    <ToastProvider>
      <WordLookupProvider inTest={inTest}>
        {!inTest && (
          <div className="regular-only">
            <AppBar route={route} />
          </div>
        )}
        <StorageWarning />
        <main className={inTest ? 'main-test' : undefined}>
          <Page route={route} />
        </main>
        {!inTest && (
          <>
            <footer className="footer">
              KrokLingo — тренажер «Крок 1. Стоматологія» англійською. Дані зберігаються лише у вашому браузері.
            </footer>
            <div className="compact-only">
              <TabBar route={route} />
            </div>
          </>
        )}
      </WordLookupProvider>
    </ToastProvider>
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
