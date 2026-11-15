import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Mascot } from './Mascot'

interface Props {
  icon?: ReactNode
  title: string
  children?: ReactNode
  actions?: ReactNode
  /** Render without the card frame (inside an existing card). */
  bare?: boolean
  /** Show the mascot (the default); with false, the icon is shown instead. */
  mascot?: boolean
}

/** Consistent empty state: what is missing and the next step to take. */
export function EmptyState({ icon, title, children, actions, bare = false, mascot = true }: Props) {
  const body = (
    <div className="empty">
      {mascot ? (
        <Mascot pose="thumb" size={bare ? 96 : 128} className="empty-mascot" />
      ) : (
        icon && <div className="empty-icon">{icon}</div>
      )}
      <h2 className="empty-title">{title}</h2>
      {children && <p>{children}</p>}
      {actions && <div className="row">{actions}</div>}
    </div>
  )
  return bare ? body : <Card className="py-0">{body}</Card>
}
