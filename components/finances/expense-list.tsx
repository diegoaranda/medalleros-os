'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ReceiptText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { deleteExpense } from '@/app/finances/actions'
import type { Expense } from '@/lib/finance/metrics'
import { formatDate, formatMoney } from '@/lib/orders/types'

type ExpenseListProps = {
  expenses: Expense[]
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (expenses.length === 0) {
    return <EmptyState icon={ReceiptText} title="No hay gastos registrados." description="Los gastos reales del período aparecerán aquí." />
  }

  const handleDelete = (id: string) => {
    setError('')
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteExpense(id)

      if (!result.ok) {
        setError(result.error)
        setDeletingId(null)
        return
      }

      router.refresh()
      setDeletingId(null)
    })
  }

  return (
    <div>
      {error ? <p className="p-4 text-sm text-destructive">{error}</p> : null}
      <div className="divide-y divide-border">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex flex-col p-4 transition-colors hover:bg-muted/35 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="md:hidden space-y-2 mb-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-semibold text-foreground">{expense.category_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(expense.expense_date)}</p>
                </div>
                <span className="numeric font-bold text-amber-700">{formatMoney(expense.amount)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{expense.description}</p>
              <Button variant="ghost" size="sm" className="text-red-700 hover:text-red-800" onClick={() => handleDelete(expense.id)} disabled={isPending && deletingId === expense.id} aria-label={`Eliminar gasto ${expense.description}`}>
                <Trash2 size={16} />
                Eliminar
              </Button>
            </div>

            <div className="hidden md:flex md:items-center md:justify-between flex-1 gap-4">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{expense.category_name}</p>
                <p className="text-sm text-muted-foreground">{expense.description}</p>
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(expense.expense_date)}</div>
              <div className="numeric min-w-[100px] text-right font-bold text-amber-700">{formatMoney(expense.amount)}</div>
              <Button variant="ghost" size="icon-sm" className="text-red-700 hover:text-red-800" onClick={() => handleDelete(expense.id)} disabled={isPending && deletingId === expense.id} aria-label={`Eliminar gasto ${expense.description}`}>
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
