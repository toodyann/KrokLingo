import { lazy, Suspense, useRef, useState, type ComponentType } from 'react'
import { BookOpen, CircleUserRound, ClipboardCheck, History, House, Settings } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Avatar } from './components/Avatar'
import { BrandMark } from './components/BrandMark'
import { ConfirmProvider } from './components/ConfirmDialog'
import { PwaPrompt } from './components/PwaPrompt'
import { SidebarAccount } from './components/SidebarAccount'
import { ToastProvider } from './components/Toast'
import { WordLookupProvider } from './components/WordLookup'
import { useRoute, type Route, link } from './lib/router'
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
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>
  routes: Route['name'][]
}

// Top-level sections, named for what they contain.
const TABS: Tab[] = [
  { path: '', label: 'Головна', Icon: House, routes: ['home'] },
  { path: 'tests', label: 'Тести', Icon: ClipboardCheck, routes: ['tests', 'exam', 'training', 'test'] },
  { path: 'dictionary', label: 'Словник', Icon: BookOpen, routes: ['dictionary', 'flashcards'] },
  { path: 'history', label: 'Історія', Icon: History, routes: ['history', 'results'] },
  { path: 'settings', label: 'Налаштування', Icon: Settings, routes: ['settings'] },
]

function DictionaryBadge() {
  const { dictionary } = useApp()
  const toLearn = dictionary.filter((e) => !e.learned).length
  return toLearn > 0 ? <span className="tab-badge">{toLearn > 99 ? '99+' : toLearn}</span> : null
}

/**
 * Wide screens: the tab bar becomes an icon rail. It peeks open over the content (no layout shift)
 * on mouse hover or keyboard focus, and closes again when the pointer leaves or a section is chosen.
 */
function Sidebar({ route }: { route: Route }) {
  const [peek, setPeek] = useState(false)
  // After choosing a section the pointer is still over the panel; it must not peek straight back
  // open. Hover-peek re-arms once the pointer leaves.
  const suppressPeek = useRef(false)
  // the account menu keeps the panel open while it is showing
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <aside
      className={`sidebar rail${peek || menuOpen ? ' peek' : ''}`}
      aria-label="Розділи"
      onPointerEnter={(e) => {
        // touch taps navigate directly; only a mouse or pen hover peeks
        if (e.pointerType !== 'touch' && !suppressPeek.current) setPeek(true)
      }}
      onPointerLeave={() => {
        suppressPeek.current = false
        setPeek(false)
      }}
      onFocus={(e) => {
        if (e.target.matches(':focus-visible')) setPeek(true)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeek(false)
      }}
      onClick={(e) => {
        // choosing a section closes the peeked panel right away
        if ((e.target as HTMLElement).closest('a')) {
          suppressPeek.current = true
          setPeek(false)
        }
      }}
    >
      <a className="brand" href={link('')} aria-label="KrokLingo — на головну">
        <BrandMark size={32} />
        <span className="brand-text fade">
          <span className="brand-name">KrokLingo</span>
        </span>
      </a>
      <nav className="side-nav">
        {TABS.map(({ path, label, Icon, routes }) => (
          <a
            key={path}
            className="side-item"
            href={link(path)}
            aria-current={routes.includes(route.name) ? 'page' : undefined}
          >
            <Icon strokeWidth={2} />
            <span className="label fade">{label}</span>
            {path === 'dictionary' && <DictionaryBadge />}
          </a>
        ))}
      </nav>
      <SidebarAccount
        onMenuOpenChange={(open) => {
          setMenuOpen(open)
          // closing the menu does not re-open the panel under a pointer that has already left it
          if (!open) setPeek(false)
        }}
      />
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
            href={link(path)}
            aria-current={routes.includes(route.name) ? 'page' : undefined}
          >
            {path === 'settings' ? (
              <ProfileTab />
            ) : (
              <>
                <Icon strokeWidth={2} />
                {label}
              </>
            )}
            {path === 'dictionary' && <DictionaryBadge />}
          </a>
        ))}
      </div>
    </nav>
  )
}

/** On phones the settings tab is the profile: the Google picture once signed in. */
function ProfileTab() {
  const { account } = useApp()
  return (
    <>
      {account.user ? <Avatar user={account.user} size={24} /> : <CircleUserRound strokeWidth={2} />}
      Профіль
    </>
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
    <ConfirmProvider>
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
    </ConfirmProvider>
    </ToastProvider>
    </TooltipProvider>
  )
}

function App() {
  // AppProvider suspends until the cached question bank has been read; the service worker is
  // registered beside it, so even a first visit that is still waiting for the bank gets offline files.
  return (
    <>
      <Suspense fallback={null}>
        <AppProvider>
          <Shell />
        </AppProvider>
      </Suspense>
      <PwaPrompt />
    </>
  )
}

export default App
