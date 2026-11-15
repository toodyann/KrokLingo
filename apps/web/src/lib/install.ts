import { useSyncExternalStore } from 'react'

// Chromium offers installation through a "beforeinstallprompt" event that can fire before React
// mounts, so it is caught here at load and kept until the user asks to install.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // the app shows its own button
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

const standaloneQuery = typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)') : null

function isStandalone(): boolean {
  return Boolean(standaloneQuery?.matches || (navigator as { standalone?: boolean }).standalone)
}

export type InstallState = 'installed' | 'available' | 'ios' | 'unsupported'

function current(): InstallState {
  if (isStandalone()) return 'installed'
  if (deferred) return 'available'
  // iOS has no install prompt: the app is added from Safari's share menu
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'ios'
  return 'unsupported'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  standaloneQuery?.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    standaloneQuery?.removeEventListener('change', listener)
  }
}

export function useInstall(): { state: InstallState; install: () => Promise<void> } {
  const state = useSyncExternalStore(subscribe, current, () => 'unsupported' as const)
  return {
    state,
    install: async () => {
      if (!deferred) return
      const e = deferred
      await e.prompt()
      await e.userChoice
      deferred = null
      emit()
    },
  }
}
