import { useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { displayName } from '../lib/cloud/account'
import { SYNC_STATUS } from '../lib/cloud/status'
import { link } from '../lib/router'
import { useApp } from '../store/context'
import { Avatar } from './Avatar'
import { IconGear, IconLogout, IconUser } from './Icons'

/**
 * Bottom of the sidebar: who is signed in. Opens a menu with the account's details, a link to the
 * settings and signing out. Signed out, it is a sign-in button; without sync configured, nothing.
 */
export function SidebarAccount({ onMenuOpenChange }: { onMenuOpenChange: (open: boolean) => void }) {
  const { account } = useApp()
  // Focus goes back to the button only when the menu was closed from the keyboard; after a mouse
  // close it would hold the sidebar open (keyboard focus opens it).
  const closedByKeyboard = useRef(false)
  if (!account.enabled) return null

  if (!account.user) {
    return (
      <button
        type="button"
        className="side-account"
        onClick={() => void account.signIn()}
        disabled={account.status === 'connecting'}
      >
        <span className="avatar avatar-initial" aria-hidden="true">
          <IconUser size={18} />
        </span>
        <span className="side-account-text fade">
          <span className="side-account-name">Увійти</span>
          <span className="side-account-sub">через Google</span>
        </span>
      </button>
    )
  }

  const { user } = account
  const name = displayName(user)
  const status = SYNC_STATUS[account.status]
  return (
    <DropdownMenu onOpenChange={onMenuOpenChange}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="side-account" aria-label={`Обліковий запис: ${name}`}>
          <span className="side-account-avatar">
            <Avatar user={user} size={32} />
            {(account.status === 'error' || account.status === 'offline') && (
              <span className={`side-account-dot ${account.status}`} aria-hidden="true" />
            )}
          </span>
          <span className="side-account-text fade">
            <span className="side-account-name">{name}</span>
            {user.email && <span className="side-account-sub">{user.email}</span>}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={10}
        className="w-64"
        onEscapeKeyDown={() => {
          closedByKeyboard.current = true
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'Tab')
            closedByKeyboard.current = true
        }}
        onCloseAutoFocus={(e) => {
          if (!closedByKeyboard.current) e.preventDefault()
          closedByKeyboard.current = false
        }}
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal text-foreground">
          <Avatar user={user} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            {user.email && <span className="block truncate text-xs text-muted-foreground">{user.email}</span>}
            <span className="block truncate text-xs text-muted-foreground">{status.label}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={link('settings')}>
            <IconGear size={16} />
            Налаштування
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => void account.signOut()}>
          <IconLogout size={16} />
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
