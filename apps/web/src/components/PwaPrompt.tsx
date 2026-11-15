import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

const HOUR = 60 * 60 * 1000

/**
 * Registers the service worker, outside the app's providers so it runs even while the question bank
 * is still loading. When a new version has been downloaded it waits for the user's "Оновити" instead
 * of reloading on its own, so a running test is never interrupted.
 */
export function PwaPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // an installed app can stay open for days: look for a new version every hour
      if (registration) setInterval(() => void registration.update(), HOUR)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (needRefresh) {
    return (
      <div className="pwa-prompt" role="alertdialog" aria-labelledby="pwa-prompt-title">
        <div>
          <div id="pwa-prompt-title" className="pwa-prompt-title">
            Доступна нова версія
          </div>
          <div className="pwa-prompt-text">Оновлення займе кілька секунд, незавершений тест збережеться.</div>
        </div>
        <div className="pwa-prompt-actions">
          <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
            Пізніше
          </Button>
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            Оновити
          </Button>
        </div>
      </div>
    )
  }
  if (offlineReady) {
    return (
      <div className="pwa-prompt" role="status">
        <div className="pwa-prompt-title">KrokLingo готовий працювати без інтернету</div>
      </div>
    )
  }
  return null
}
