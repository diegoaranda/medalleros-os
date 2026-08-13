'use client'

import { useState } from 'react'
import { AlertTriangle, ClipboardList, DollarSign, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, PaymentMethodOption } from '@/lib/orders/types'
import {
  deliveryTypeLabels,
  formatMoney,
  normalizeDeliveryType,
  normalizeOrderStatus,
  statusColors,
  statusLabels,
} from '@/lib/orders/types'
import { OrderDetailModal } from './order-detail-modal'

type OrdersListProps = {
  orders: OrderWithFinancials[]
  sports: CatalogOption[]
  paymentMethods: PaymentMethodOption[]
  defaultProductionExpense: number
  maskLegacyRequestNumbers?: boolean
}

type DetailState = {
  order: OrderWithFinancials
  tab: 'info' | 'payments'
} | null

export function OrdersList({
  orders,
  sports,
  paymentMethods,
  defaultProductionExpense,
  maskLegacyRequestNumbers = false,
}: OrdersListProps) {
  const [detailState, setDetailState] = useState<DetailState>(null)
  const displayRequestNumber = (requestNumber: string) => (
    maskLegacyRequestNumbers && requestNumber.startsWith('LEGACY-') ? 'Histórico' : requestNumber
  )

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No hay pedidos para mostrar."
        description="Prueba otro término de búsqueda o cambia el filtro de estado."
      />
    )
  }

  return (
    <div>
      <div className="hidden grid-cols-[1fr_1.35fr_.9fr_.8fr_.8fr_.8fr_.8fr_.9fr] gap-3 border-b border-border bg-muted/55 px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground lg:grid">
        <div>Solicitud</div>
        <div>Cliente</div>
        <div>Deporte</div>
        <div className="text-right">Total</div>
        <div className="text-right">Cobrado</div>
        <div className="text-right">Saldo</div>
        <div>Entrega</div>
        <div>Estado</div>
      </div>

      <div className="divide-y divide-border">
        {orders.map((order) => (
          <div key={order.id}>
            <div className="p-4 lg:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow truncate">Solicitud {displayRequestNumber(order.request_number)}</p>
                  <p className="mt-1 truncate font-semibold text-foreground">{order.customer_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{order.sport_name} · {deliveryTypeLabels[normalizeDeliveryType(order.delivery_type)]}</p>
                  {Number(order.production_cost) <= 0 ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle size={13} />Costo Eugenio pendiente</p> : null}
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>
                  {statusLabels[normalizeOrderStatus(order.status)]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border py-3 text-xs">
                <div><p className="text-muted-foreground">Total</p><p className="numeric mt-1 font-semibold">{formatMoney(order.total_amount)}</p></div>
                <div><p className="text-muted-foreground">Cobrado</p><p className="numeric mt-1 font-semibold text-emerald-700">{formatMoney(order.paid_amount)}</p></div>
                <div><p className="text-muted-foreground">Saldo</p><p className={`numeric mt-1 font-bold ${order.balance_amount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(order.balance_amount)}</p></div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDetailState({ order, tab: 'info' })}>
                  <Eye size={16} className="mr-1" />
                  Ver detalle
                </Button>
                <Button variant="outline" onClick={() => setDetailState({ order, tab: 'payments' })}>
                  <DollarSign size={16} className="mr-1" />
                  Registrar pago
                </Button>
              </div>
            </div>

            <div className="hidden grid-cols-[1fr_1.35fr_.9fr_.8fr_.8fr_.8fr_.8fr_.9fr] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 lg:grid">
              <div className="font-semibold text-foreground">{displayRequestNumber(order.request_number)}</div>
              <button className="truncate text-left font-semibold text-foreground hover:underline" type="button" onClick={() => setDetailState({ order, tab: 'info' })}>{order.customer_name}</button>
              <div className="text-sm text-muted-foreground"><span>{order.sport_name}</span>{Number(order.production_cost) <= 0 ? <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle size={13} />Costo pendiente</span> : null}</div>
              <div className="numeric text-right text-sm font-semibold text-foreground">{formatMoney(order.total_amount)}</div>
              <div className="numeric text-right text-sm font-semibold text-emerald-700">{formatMoney(order.paid_amount)}</div>
              <div className={`numeric text-right text-sm font-bold ${order.balance_amount > 0 ? 'text-destructive' : 'text-emerald-700'}`}>{formatMoney(order.balance_amount)}</div>
              <div className="text-sm text-muted-foreground">{deliveryTypeLabels[normalizeDeliveryType(order.delivery_type)]}</div>
              <div className="flex items-center justify-between gap-1">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>
                  {statusLabels[normalizeOrderStatus(order.status)]}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setDetailState({ order, tab: 'payments' })} aria-label={`Registrar pago de ${order.customer_name}`} title="Registrar pago">
                  <DollarSign size={16} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {detailState ? (
        <OrderDetailModal
          order={detailState.order}
          open={Boolean(detailState)}
          onOpenChange={(open) => !open && setDetailState(null)}
          sports={sports}
          paymentMethods={paymentMethods}
          defaultProductionExpense={defaultProductionExpense}
          initialTab={detailState.tab}
          requestNumberLabel={displayRequestNumber(detailState.order.request_number)}
        />
      ) : null}
    </div>
  )
}
