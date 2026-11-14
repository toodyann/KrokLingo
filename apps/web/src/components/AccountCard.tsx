import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '../store/context'
import type { SyncStatus } from '../store/useCloudSync'

const STATUS: Record<SyncStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
  off: { label: 'Вимкнено', variant: 'secondary' },
  'signed-out': { label: 'Не виконано вхід', variant: 'secondary' },
  connecting: { label: 'Підключення…', variant: 'secondary' },
  synced: { label: 'Синхронізовано', variant: 'success' },
  saving: { label: 'Збереження…', variant: 'secondary' },
  offline: { label: 'Офлайн — зміни збережуться пізніше', variant: 'warning' },
  error: { label: 'Помилка синхронізації', variant: 'destructive' },
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Google account and server sync. Hidden behind a short note when the build has no sync configured. */
export function AccountCard() {
  const { account } = useApp()
  const status = STATUS[account.status]

  if (!account.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Обліковий запис</CardTitle>
          <CardDescription>Синхронізацію між пристроями для цієї версії не налаштовано — дані зберігаються в браузері.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!account.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Обліковий запис</CardTitle>
          <CardDescription>
            Увійдіть, щоб історія, словник і налаштування зберігалися в обліковому записі й були доступні на всіх
            пристроях. Те, що вже є в цьому браузері, буде перенесено.
          </CardDescription>
        </CardHeader>
        {account.error && <CardContent className="text-sm text-destructive">{account.error}</CardContent>}
        <CardFooter>
          <Button variant="outline" onClick={() => void account.signIn()} disabled={account.status === 'connecting'}>
            <GoogleMark />
            Увійти через Google
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const { user } = account
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Обліковий запис</CardTitle>
        <CardDescription>Дані зберігаються в обліковому записі та синхронізуються між пристроями.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" width={40} height={40} className="size-10 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-muted font-semibold" aria-hidden="true">
            {(user.name ?? user.email ?? '?').slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {user.name && <div className="truncate font-medium">{user.name}</div>}
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardContent>
      {account.error && account.status === 'error' && (
        <CardContent className="pt-0 text-sm text-destructive">{account.error}</CardContent>
      )}
      <CardFooter>
        <Button variant="outline" onClick={() => void account.signOut()}>
          Вийти
        </Button>
      </CardFooter>
    </Card>
  )
}
