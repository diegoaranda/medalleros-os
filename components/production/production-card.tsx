'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, DollarSign, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setProductionOrderStatus } from '@/app/production/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { formatMoney, normalizeOrderStatus, statusColors, statusLabels } from '@/lib/orders/types'
import { calculateOrderFinancials } from '@/lib/finance/calculations'
import { hasValidEugenioCost } from '@/lib/orders/production'
import { ProductionCostModal } from './production-cost-modal'
import { EugenioCostEditor } from '@/components/orders/eugenio-cost-editor'
import { OrderFormModal } from '@/components/orders/order-form-modal'
import type { CatalogOption, PaymentMethodOption } from '@/lib/orders/types'

type ProductionCardProps = {
  order: OrderWithFinancials
  reservePercentage: number
  sports: CatalogOption[]
  paymentMethods: PaymentMethodOption[]
  defaultProductionExpense: number
}

export function ProductionCard({ order, reservePercentage, sports, paymentMethods, defaultProductionExpense }: ProductionCardProps) {
  const router = useRouter()
  const [showCostModal, setShowCostModal] = useState(false)
  const [showAdvanceConfirmation, setShowAdvanceConfirmation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [productionCost, setProductionCost] = useState(order.production_cost)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const hasCost = hasValidEugenioCost(productionCost)
  const financials = calculateOrderFinancials({ ...order, production_cost: productionCost }, reservePercentage)

  const advanceStatus = () => {
    setError('')
    startTransition(async () => {
      const result = await setProductionOrderStatus(order.id, 'envolver')

      if (!result.ok) {
        setError(result.error)
        return
      }

      window.dispatchEvent(new CustomEvent('production-order-collected', { detail: { message: 'Pedido recogido y pendiente de envolver.' } }))
      router.refresh()
      setShowAdvanceConfirmation(false)
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
          <EugenioCostEditor orderId={order.id} initialCost={order.production_cost} onUpdated={setProductionCost} />
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
          <div id={`production-cost-warning-${order.id}`} role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            <AlertTriangle size={16} className="mt-0.5" />
            <span>Costo Eugenio pendiente</span>
          </div>
        ) : null}

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

        <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" onClick={() => setShowEditModal(true)} disabled={isPending}>
            <Edit2 size={16} className="mr-1" /> Editar pedido
          </Button>
          <Button variant="outline" onClick={() => setShowCostModal(true)} disabled={isPending}>
            <DollarSign size={16} className="mr-1" />
            Gasto / Nota
          </Button>
          <Button
            onClick={() => setShowAdvanceConfirmation(true)}
            disabled={isPending}
            aria-describedby={!hasCost ? `production-cost-warning-${order.id}` : undefined}
          >
            <ChevronRight size={16} className="mr-1" />
            Recoger
          </Button>
        </div>
      </article>

      <ProductionCostModal order={order} open={showCostModal} onOpenChange={setShowCostModal} />
      <OrderFormModal order={order} open={showEditModal} onOpenChange={setShowEditModal} sports={sports} paymentMethods={paymentMethods} defaultProductionExpense={defaultProductionExpense} />

      {showAdvanceConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`advance-order-title-${order.id}`}
            aria-describedby={`advance-order-description-${order.id}`}
            className="w-full bg-card sm:max-w-md sm:rounded-xl sm:border sm:border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <h2 id={`advance-order-title-${order.id}`} className="text-xl font-bold tracking-[-0.025em]">¿Recoger este pedido?</h2>
              <button
                onClick={() => setShowAdvanceConfirmation(false)}
                className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
                aria-label="Cerrar confirmación"
                disabled={isPending}
              >
                <X size={22} />
              </button>
            </div>
            <div className="space-y-5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
              <p id={`advance-order-description-${order.id}`} className="text-sm text-muted-foreground">
                El pedido saldrá de Producción y quedará pendiente de envolver.
              </p>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAdvanceConfirmation(false)} className="flex-1" disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="button" onClick={advanceStatus} className="flex-1" disabled={isPending}>
                  {isPending ? 'Guardando…' : 'Confirmar recogida'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
