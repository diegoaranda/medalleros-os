import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  eyebrow?: string
  action?: ReactNode
}

export function PageHeader({ title, description, eyebrow, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <div className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
