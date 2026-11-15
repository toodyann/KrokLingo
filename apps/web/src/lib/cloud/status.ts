import type { SyncStatus } from '../../store/useCloudSync'

export const SYNC_STATUS: Record<SyncStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
  off: { label: 'Вимкнено', variant: 'secondary' },
  'signed-out': { label: 'Не виконано вхід', variant: 'secondary' },
  connecting: { label: 'Підключення…', variant: 'secondary' },
  synced: { label: 'Синхронізовано', variant: 'success' },
  saving: { label: 'Збереження…', variant: 'secondary' },
  offline: { label: 'Офлайн — зміни збережуться пізніше', variant: 'warning' },
  error: { label: 'Помилка синхронізації', variant: 'destructive' },
}
