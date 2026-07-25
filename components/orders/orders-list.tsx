'use client'

import { useState } from 'react'
import { DollarSign, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <div className="p-6 text-center text-muted-foreground">
        <p>No hay pedidos disponibles</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="hidden md:grid grid-cols-8 gap-4 p-4 md:p-6 bg-muted/50 border-b border-border font-semibold text-sm text-foreground">
        <div>Solicitud</div>
        <div>Cliente</div>
        <div>Deporte</div>
        <div>Total</div>
        <div>Saldo</div>
        <div>Entrega</div>
        <div>Estado</div>
        <div>Acciones</div>
      </div>

      <div className="divide-y divide-border">
        {orders.map((order) => (
          <div key={order.id}>
            <div className="md:hidden p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Solicitud {displayRequestNumber(order.request_number)}</p>
                  <p className="font-semibold text-foreground">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{order.sport_name}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>
                  {statusLabels[normalizeOrderStatus(order.status)]}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatMoney(order.total_amount)}</span></p>
                  <p className="text-muted-foreground">Saldo: <span className={`font-semibold ${order.balance_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatMoney(order.balance_amount)}</span></p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDetailState({ order, tab: 'info' })} className="flex-1">
                  <Eye size={16} className="mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailState({ order, tab: 'payments' })} className="flex-1">
                  <DollarSign size={16} className="mr-1" />
                  Pago
                </Button>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-8 gap-4 p-4 md:p-6 items-center hover:bg-muted/50 transition">
              <div className="font-semibold text-foreground">{displayRequestNumber(order.request_number)}</div>
              <div className="font-semibold text-foreground">{order.customer_name}</div>
              <div className="text-sm text-muted-foreground">{order.sport_name}</div>
              <div className="font-semibold text-foreground">{formatMoney(order.total_amount)}</div>
              <div className={`font-semibold ${order.balance_amount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatMoney(order.balance_amount)}</div>
              <div className="text-sm text-muted-foreground">{deliveryTypeLabels[normalizeDeliveryType(order.delivery_type)]}</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>
                  {statusLabels[normalizeOrderStatus(order.status)]}
                </span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setDetailState({ order, tab: 'info' })} title="Ver detalles">
                  <Eye size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDetailState({ order, tab: 'payments' })} title="Registrar pago">
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
