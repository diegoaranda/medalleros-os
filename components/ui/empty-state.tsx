import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 py-10 text-center">
      {Icon ? (
        <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  )
}
