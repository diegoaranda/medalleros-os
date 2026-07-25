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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-md">
        <div className="border-b border-border p-4 md:p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Costos de producción</h2>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition" type="button">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">Pedido</p>
            <p className="font-semibold text-foreground">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Solicitud {order.request_number} • {order.sport_name} • {formatMoney(order.total_amount)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Gasto de producción</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input
                type="number"
                placeholder="30.00"
                value={productionExpense}
                onChange={(event) => setProductionExpense(event.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Costo con Eugenio</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input
                type="number"
                placeholder="0.00"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Costo actual: {order.production_cost === null ? 'Sin costo' : formatMoney(order.production_cost)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nota de producción</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas para producción..."
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
