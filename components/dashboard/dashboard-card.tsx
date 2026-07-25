interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
  accent?: 'blue' | 'purple' | 'orange' | 'green' | 'red'
}

const accentColors = {
  blue: 'text-slate-800',
  purple: 'text-violet-700',
  orange: 'text-amber-700',
  green: 'text-emerald-700',
  red: 'text-red-700',
}

export function DashboardCard({ title, value, subtitle, accent = 'blue' }: DashboardCardProps) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-medium leading-4 text-muted-foreground">{title}</p>
      <p className={`numeric mt-2 break-words text-2xl font-bold leading-none tracking-[-0.035em] sm:text-[1.75rem] ${accentColors[accent]}`}>
        {value}
      </p>
      {subtitle && <p className="mt-2 text-xs leading-4 text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
