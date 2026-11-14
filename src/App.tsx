import { useEffect, useState, type ComponentType } from 'react'
import { BrandMark } from './components/BrandMark'
import { IconBook, IconChart, IconChevronLeft, IconGear, IconTests } from './components/Icons'
import { ToastProvider } from './components/Toast'
import { WordLookupProvider } from './components/WordLookup'
import { useMediaQuery, WIDE_QUERY } from './lib/hooks'
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

const COLLAPSE_KEY = 'kroklingo:sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Wide screens: the tab bar becomes a sidebar. It can be collapsed to an icon rail, which
 * peeks open over the content on hover (after a short intent delay) or keyboard focus.
 */
function Sidebar({ route }: { route: Route }) {
  const wide = useMediaQuery(WIDE_QUERY)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const rail = !wide || collapsed

  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed)
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // per-viewer convenience only
    }
  }, [collapsed])

  return (
    <aside className={`sidebar${rail ? ' rail' : ''}`} aria-label="Розділи">
      <a className="brand" href="#/" aria-label="KrokLingo — на головну">
        <BrandMark size={38} />
        <span className="brand-text fade">
          <span className="brand-name">KrokLingo</span>
          <br />
          <span className="brand-caption">Крок 1 · Стоматологія</span>
        </span>
      </a>
      <nav className="side-nav">
        {TABS.map(({ path, label, Icon, routes }) => (
          <a
            key={path}
            className="side-item"
            href={`#/${path}`}
            aria-current={routes.includes(route.name) ? 'page' : undefined}
          >
            <Icon />
            <span className="label fade">{label}</span>
            {path === 'dictionary' && <DictionaryBadge />}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        {wide && (
          <button
            type="button"
            className="icon-btn sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Закріпити бічну панель розгорнутою' : 'Згорнути бічну панель'}
            title={collapsed ? 'Закріпити розгорнутою' : 'Згорнути (розкриватиметься при наведенні)'}
            aria-expanded={!collapsed}
          >
            <IconChevronLeft />
          </button>
        )}
      </div>
    </aside>
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
  // A running test is a focused, modal task: no sidebar or tab bar, its own toolbar with a clear way out.
  const inTest = route.name === 'test'
  return (
    <ToastProvider>
      <WordLookupProvider inTest={inTest}>
        {!inTest && (
          <div className="regular-only">
            <Sidebar route={route} />
          </div>
        )}
        <div className={inTest ? undefined : 'with-sidebar'}>
          <StorageWarning />
          <main className={inTest ? 'main-test' : undefined}>
            <Page route={route} />
          </main>
        </div>
        {!inTest && (
          <div className="compact-only">
            <TabBar route={route} />
          </div>
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
