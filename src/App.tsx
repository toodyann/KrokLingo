import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BrandMark } from './components/BrandMark'
import { IconBook, IconChevronLeft, IconGear, IconHistory, IconOverview, IconTests } from './components/Icons'
import { ToastProvider } from './components/Toast'
import { WordLookupProvider } from './components/WordLookup'
import { useMediaQuery, WIDE_QUERY } from './lib/hooks'
import { useRoute, type Route } from './lib/router'
import { AppProvider } from './store/AppStore'
import { useApp } from './store/context'

// Every screen is its own chunk; charts (Recharts) and Radix widgets load only where used.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const DictionaryPage = lazy(() => import('./pages/DictionaryPage').then((m) => ({ default: m.DictionaryPage })))
const ExamSetupPage = lazy(() => import('./pages/ExamSetupPage').then((m) => ({ default: m.ExamSetupPage })))
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage').then((m) => ({ default: m.FlashcardsPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const TestPage = lazy(() => import('./pages/TestPage').then((m) => ({ default: m.TestPage })))
const TestsPage = lazy(() => import('./pages/TestsPage').then((m) => ({ default: m.TestsPage })))
const TrainingSetupPage = lazy(() => import('./pages/TrainingSetupPage').then((m) => ({ default: m.TrainingSetupPage })))

interface Tab {
  path: string
  label: string
  Icon: ComponentType<{ size?: number }>
  routes: Route['name'][]
}

// Top-level sections, named for what they contain.
const TABS: Tab[] = [
  { path: '', label: 'Огляд', Icon: IconOverview, routes: ['home'] },
  { path: 'tests', label: 'Тести', Icon: IconTests, routes: ['tests', 'exam', 'training', 'test'] },
  { path: 'dictionary', label: 'Словник', Icon: IconBook, routes: ['dictionary', 'flashcards'] },
  { path: 'history', label: 'Історія', Icon: IconHistory, routes: ['history', 'results'] },
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
  // Right after "collapse" the pointer (and focus) is still on the sidebar; without this the
  // peek-on-hover would reopen it at once. Peeking resumes once the pointer or focus leaves.
  const [peekSuppressed, setPeekSuppressed] = useState(false)
  const rail = !wide || collapsed

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    setPeekSuppressed(next)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed)
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // per-viewer convenience only
    }
  }, [collapsed])

  return (
    <aside
      className={`sidebar${rail ? ' rail' : ''}${peekSuppressed ? ' no-peek' : ''}`}
      aria-label="Розділи"
      onPointerLeave={() => setPeekSuppressed(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeekSuppressed(false)
      }}
    >
      <a className="brand" href="#/" aria-label="KrokLingo — на головну">
        <BrandMark size={32} />
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="sidebar-toggle text-muted-foreground"
                onClick={toggle}
                aria-label={collapsed ? 'Закріпити бічну панель розгорнутою' : 'Згорнути бічну панель'}
                aria-expanded={!collapsed}
              >
                <IconChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? 'Закріпити розгорнутою' : 'Згорнути'}</TooltipContent>
          </Tooltip>
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
    case 'tests':
      return <TestsPage />
    default:
      return <DashboardPage />
  }
}

function StorageWarning() {
  const { storageError } = useApp()
  if (!storageError) return null
  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <Alert variant="destructive">
        <AlertTitle>Не вдалося зберегти дані</AlertTitle>
        <AlertDescription>
          Пам'ять браузера заповнена або вимкнена. Збережіть резервну копію в налаштуваннях.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function Shell() {
  const route = useRoute()
  // A running test is a focused, modal task: no sidebar or tab bar, its own toolbar with a clear way out.
  const inTest = route.name === 'test'
  return (
    <TooltipProvider delayDuration={300}>
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
            <Suspense fallback={null}>
              <Page route={route} />
            </Suspense>
          </main>
        </div>
        {!inTest && (
          <div className="compact-only">
            <TabBar route={route} />
          </div>
        )}
      </WordLookupProvider>
    </ToastProvider>
    </TooltipProvider>
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
