import type { ReactNode } from 'react'
import { IconChevronLeft } from './Icons'

interface Props {
  title: string
  subtitle?: ReactNode
  back?: { href: string; label: string }
  actions?: ReactNode
}

/** Large title with optional back link — answers "where am I, how do I get out". */
export function PageHeader({ title, subtitle, back, actions }: Props) {
  return (
    <header className="page-header">
      <div>
        {back && (
          <a className="back-link" href={back.href}>
            <IconChevronLeft />
            {back.label}
          </a>
        )}
        <h1 className="t-large-title">{title}</h1>
        {subtitle && <p className="secondary t-subhead" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  )
}
