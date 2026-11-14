import { useEffect, useState, useSyncExternalStore } from 'react'

/** Current time, refreshed every `intervalMs` while `active` is true. */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, active])
  return now
}

/** Subscribes to a CSS media query. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

/** Compact width: phones and narrow windows — bottom tab bar, sheets instead of popovers. */
export const COMPACT_QUERY = '(max-width: 767px)'

/** Wide enough for the full sidebar with labels. */
export const WIDE_QUERY = '(min-width: 1200px)'
