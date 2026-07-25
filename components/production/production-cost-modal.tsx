'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateProductionInfo } from '@/app/production/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { formatMoney } from '@/lib/orders/types'

type ProductionCostModalProps = {
  order: OrderWithFinancials
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductionCostModal({ order, open, onOpenChange }: ProductionCostModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cost, setCost] = useState('')
  const [productionExpense, setProductionExpense] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCost(order.production_cost === null ? '' : String(order.production_cost))
    setProductionExpense(String(order.production_expense))
    setNotes(order.production_notes ?? '')
    setError('')
  }, [open, order.production_cost, order.production_expense, order.production_notes])

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await updateProductionInfo(order.id, {
        production_cost: cost,
        production_expense: productionExpense,
        production_notes: notes,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
      onOpenChange(false)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="production-cost-title" className="max-h-[100dvh] w-full overflow-y-auto bg-card sm:max-w-md sm:rounded-xl sm:border sm:border-border">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:py-4">
          <h2 id="production-cost-title" className="text-xl font-bold tracking-[-0.025em]">Costos de producción</h2>
          <button onClick={() => onOpenChange(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar formulario">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-sm text-muted-foreground mb-1">Pedido</p>
            <p className="font-semibold text-foreground">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Solicitud {order.request_number} • {order.sport_name} • {formatMoney(order.total_amount)}
            </p>
          </div>

          <div>
            <label htmlFor="production-expense-cost" className="field-label">Gasto de producción</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input
                id="production-expense-cost"
                type="number"
                inputMode="decimal"
                placeholder="30.00"
                value={productionExpense}
                onChange={(event) => setProductionExpense(event.target.value)}
                className="field-control numeric pl-11"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="eugenio-cost" className="field-label">Costo con Eugenio</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input
                id="eugenio-cost"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className="field-control numeric pl-11"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Costo actual: {order.production_cost === null ? 'Sin costo' : formatMoney(order.production_cost)}
            </p>
          </div>

          <div>
            <label htmlFor="production-note" className="field-label">Nota de producción</label>
            <textarea
              id="production-note"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas para producción..."
              className="field-control min-h-24 resize-y py-3"
              rows={3}
            />
          </div>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
