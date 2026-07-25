import { formatMoney } from '@/lib/orders/types'

interface FinanceCardProps {
  title: string
  amount: number
  count: number
}

export function FinanceCard({ title, amount, count }: FinanceCardProps) {
  return (
    <div className="surface flex items-end justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="numeric mt-1 text-xl font-bold text-foreground">
          {formatMoney(amount)}
        </p>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">{count} registro{count !== 1 ? 's' : ''}</p>
    </div>
  )
}
