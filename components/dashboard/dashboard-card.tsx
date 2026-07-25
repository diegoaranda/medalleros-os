interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
  accent?: 'blue' | 'purple' | 'orange' | 'green' | 'red'
}

const accentColors = {
  blue: 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200',
  purple: 'bg-slate-200 text-slate-800 dark:bg-slate-700/30 dark:text-slate-200',
  orange: 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200',
  green: 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200',
  red: 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200',
}

export function DashboardCard({ title, value, subtitle, accent = 'blue' }: DashboardCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <div className={`mt-3 inline-block rounded-lg px-4 py-2 ${accentColors[accent]}`}>
        <p className="text-2xl md:text-3xl font-bold">{value}</p>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-3">{subtitle}</p>}
    </div>
  )
}
