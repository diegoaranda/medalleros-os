import { formatMoney } from '@/lib/orders/types'

interface FinanceCardProps {
  title: string
  amount: number
  count: number
}

export function FinanceCard({ title, amount, count }: FinanceCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
      <p className="text-sm text-muted-foreground font-medium mb-2">{title}</p>
      <div className="space-y-2">
        <p className="text-2xl md:text-3xl font-bold text-foreground">
          {formatMoney(amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {count} registro{count !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
