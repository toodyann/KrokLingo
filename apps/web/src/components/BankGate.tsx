import { Button } from '@/components/ui/button'
import { Mascot } from './Mascot'

/** Shown on the very first visit until the question bank has arrived from the server. */
export function BankGate({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <main className="bank-gate" aria-live="polite" aria-busy={!error}>
      <Mascot pose={error ? 'thumb' : 'cheer'} size={180} className="bank-gate-mascot" />
      {error ? (
        <>
          <h1>Не вдалося завантажити питання</h1>
          <p>Перевірте з’єднання з інтернетом і спробуйте ще раз.</p>
          <p className="bank-gate-detail">{error}</p>
          <Button size="lg" onClick={onRetry}>
            Спробувати ще раз
          </Button>
        </>
      ) : (
        <>
          <h1>Завантажуємо питання…</h1>
          <p>
            Перший запуск може тривати до хвилини, поки сервер прокидається. Далі питання зберігаються на цьому
            пристрої.
          </p>
          <span className="bank-gate-spinner" aria-hidden="true" />
        </>
      )}
    </main>
  )
}
