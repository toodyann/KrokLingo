import { useEffect, useState } from 'react'

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

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
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

export function navigate(path: string): void {
  const target = '#/' + path.replace(/^\/+/, '')
  if (window.location.hash !== target) {
    window.location.hash = target
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
