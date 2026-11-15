import type { AccountUser } from '../../store/useCloudSync'

/** Name to show: the full name, else the part of the e-mail before "@". */
export function displayName(user: AccountUser): string {
  return user.name ?? user.email?.split('@')[0] ?? 'Обліковий запис'
}
