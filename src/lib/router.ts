import { useEffect, useState } from 'react'

// Path-based routing on the History API: /KrokLingo/tests instead of /KrokLingo/#/tests.
// GitHub Pages has no rewrites, so the build also ships index.html as 404.html: any deep link
// loads the app, which then reads the path. Old "#/…" links are converted on start.

export type Route =
  | { name: 'home' }
  | { name: 'tests' }
  | { name: 'exam' }
  | { name: 'training' }
  | { name: 'test' }
  | { name: 'results'; id: string }
  | { name: 'history' }
  | { name: 'dictionary' }
  | { name: 'flashcards' }
  | { name: 'settings' }

/** '/' in development, '/KrokLingo/' on GitHub Pages. */
const BASE = import.meta.env.BASE_URL

/** In-app path ("tests", "results/abc") → URL path under the app base. */
export function link(path = '', base = BASE): string {
  return base + path.replace(/^\/+/, '')
}

/** Reads a route from a URL path; unknown paths land on the home screen. */
export function parsePath(pathname: string, base = BASE): Route {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\/+/, '')
  const parts = decodeURIComponent(rest).split('/').filter(Boolean)
  switch (parts[0]) {
    case 'tests':
      return { name: 'tests' }
    case 'exam':
      return { name: 'exam' }
    case 'training':
      return { name: 'training' }
    case 'test':
      return { name: 'test' }
    case 'results':
      return parts[1] ? { name: 'results', id: parts[1] } : { name: 'history' }
    case 'history':
      return { name: 'history' }
    case 'dictionary':
      return { name: 'dictionary' }
    case 'flashcards':
      return { name: 'flashcards' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'home' }
  }
}

/** "#/tests" (old hash links) → "tests"; null when the hash is not an old route. */
export function legacyHashPath(hash: string): string | null {
  return hash.startsWith('#/') ? hash.slice(2) : null
}

const CHANGE = 'routechange'

export function navigate(path: string, { replace = false } = {}): void {
  const target = link(path)
  if (window.location.pathname === target) return
  if (replace) window.history.replaceState(null, '', target)
  else window.history.pushState(null, '', target)
  window.dispatchEvent(new Event(CHANGE))
}

/** Same-document link inside the app that a plain click should handle without a page load. */
function internalPath(e: MouseEvent): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const a = (e.target as Element | null)?.closest?.('a')
  if (!a || !a.href || a.target || a.hasAttribute('download')) return null
  const url = new URL(a.href)
  if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE)) return null
  return url.pathname.slice(BASE.length) + url.search
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => {
    const legacy = legacyHashPath(window.location.hash)
    if (legacy !== null) window.history.replaceState(null, '', link(legacy))
    return parsePath(window.location.pathname)
  })

  useEffect(() => {
    const onChange = () => {
      setRoute(parsePath(window.location.pathname))
      window.scrollTo(0, 0)
    }
    const onClick = (e: MouseEvent) => {
      const path = internalPath(e)
      if (path === null) return
      e.preventDefault()
      navigate(path)
    }
    const onHash = () => {
      const legacy = legacyHashPath(window.location.hash)
      if (legacy !== null) navigate(legacy, { replace: true })
    }
    window.addEventListener('popstate', onChange)
    window.addEventListener(CHANGE, onChange)
    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener(CHANGE, onChange)
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onClick)
    }
  }, [])
  return route
}
