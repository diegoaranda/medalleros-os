'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setProductionOrderStatus } from '@/app/production/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { formatMoney, normalizeOrderStatus, statusColors, statusLabels } from '@/lib/orders/types'
import { calculateOrderFinancials } from '@/lib/finance/calculations'
import { ProductionCostModal } from './production-cost-modal'

type ProductionCardProps = {
  order: OrderWithFinancials
  reservePercentage: number
}

export function ProductionCard({ order, reservePercentage }: ProductionCardProps) {
  const router = useRouter()
  const [showCostModal, setShowCostModal] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const hasCost = order.production_cost !== null
  const financials = calculateOrderFinancials(order, reservePercentage)

  const advanceStatus = () => {
    setError('')
    startTransition(async () => {
      const result = await setProductionOrderStatus(order.id, 'listo')

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border p-4 hover:shadow-lg transition">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Solicitud {order.request_number}</p>
              <h3 className="font-semibold text-foreground">{order.customer_name}</h3>
              <p className="text-sm text-muted-foreground">{order.sport_name}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>
              {statusLabels[normalizeOrderStatus(order.status)]}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Precio venta:</span>
            <span className="font-semibold">{formatMoney(order.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gasto producción:</span>
            <span className="font-semibold">{formatMoney(order.production_expense)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costo Eugenio:</span>
            <span className="font-semibold">{hasCost ? formatMoney(order.production_cost) : 'Sin costo'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ganancia bruta:</span>
            <span className={`font-semibold ${financials.gross_profit < 0 ? 'text-destructive' : ''}`}>{formatMoney(financials.gross_profit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reserva {reservePercentage}%:</span>
            <span className="font-semibold">{formatMoney(financials.reserve_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-semibold">Ganancia neta:</span>
            <span className={`font-bold ${financials.net_profit < 0 ? 'text-destructive' : ''}`}>{formatMoney(financials.net_profit)}</span>
          </div>
        </div>

        {order.production_notes ? (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
            {order.production_notes}
          </div>
        ) : null}

        {!hasCost ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5" />
            <span>Costo Eugenio pendiente</span>
          </div>
        ) : null}

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCostModal(true)} className="flex-1" disabled={isPending}>
            <DollarSign size={16} className="mr-1" />
            Costos / Nota
          </Button>
          <Button size="sm" className="flex-1" onClick={advanceStatus} disabled={isPending}>
            <ChevronRight size={16} className="mr-1" />
            {isPending ? 'Guardando...' : 'Marcar listo'}
          </Button>
        </div>
      </div>

      <ProductionCostModal order={order} open={showCostModal} onOpenChange={setShowCostModal} />
    </>
  )
}
