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
      <article className={`bg-card p-4 transition-colors hover:bg-muted/25 sm:p-5 ${!hasCost ? 'border-l-3 border-l-amber-400' : ''}`}>
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Solicitud {order.request_number}</p>
              <h3 className="mt-1 truncate font-semibold text-foreground">{order.customer_name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{order.sport_name}</p>
            </div>
            <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>
              {statusLabels[normalizeOrderStatus(order.status)]}
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <span className="text-xs text-muted-foreground">Precio venta</span>
            <p className="numeric mt-0.5 font-semibold">{formatMoney(order.total_amount)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Gasto producción</span>
            <p className="numeric mt-0.5 font-semibold text-amber-700">{formatMoney(order.production_expense)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Costo Eugenio</span>
            <p className={`numeric mt-0.5 font-semibold ${hasCost ? 'text-amber-700' : 'text-red-700'}`}>{hasCost ? formatMoney(order.production_cost) : 'Pendiente'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Ganancia bruta</span>
            <p className={`numeric mt-0.5 font-semibold ${financials.gross_profit < 0 ? 'text-destructive' : 'text-emerald-700'}`}>{formatMoney(financials.gross_profit)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Diezmo {reservePercentage}%</span>
            <p className="numeric mt-0.5 font-semibold text-violet-700">{formatMoney(financials.reserve_amount)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Ganancia neta</span>
            <p className={`numeric mt-0.5 font-bold ${financials.net_profit < 0 ? 'text-destructive' : 'text-emerald-700'}`}>{formatMoney(financials.net_profit)}</p>
          </div>
        </div>

        {order.production_notes ? (
          <div className="mb-4 border-l-2 border-border pl-3 text-sm text-muted-foreground">
            {order.production_notes}
          </div>
        ) : null}

        {!hasCost ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle size={16} className="mt-0.5" />
            <span>Costo Eugenio pendiente</span>
          </div>
        ) : null}

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" onClick={() => setShowCostModal(true)} disabled={isPending}>
            <DollarSign size={16} className="mr-1" />
            Costos / Nota
          </Button>
          <Button onClick={advanceStatus} disabled={isPending}>
            <ChevronRight size={16} className="mr-1" />
            {isPending ? 'Guardando...' : 'Marcar listo'}
          </Button>
        </div>
      </article>

      <ProductionCostModal order={order} open={showCostModal} onOpenChange={setShowCostModal} />
    </>
  )
}
