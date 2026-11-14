import type { ReactNode } from 'react'
import { IconChevronLeft } from './Icons'

interface Props {
  title: string
  subtitle?: ReactNode
  back?: { href: string; label: string }
  actions?: ReactNode
}

/** Page title with optional back link and actions — answers "where am I, how do I get out". */
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
        <h1 className="t-page">{title}</h1>
        {subtitle && <p className="page-header-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
