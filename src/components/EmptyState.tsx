import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface Props {
  icon?: ReactNode
  title: string
  children?: ReactNode
  actions?: ReactNode
  /** Render without the card frame (inside an existing card). */
  bare?: boolean
}

/** Consistent empty state: what is missing and the next step to take. */
export function EmptyState({ icon, title, children, actions, bare = false }: Props) {
  const body = (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h2 className="empty-title">{title}</h2>
      {children && <p>{children}</p>}
      {actions && <div className="row">{actions}</div>}
    </div>
  )
  return bare ? body : <Card className="py-0">{body}</Card>
}
