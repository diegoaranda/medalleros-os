'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OrderWithFinancials } from '@/lib/data/queries'
import {
  deliveryTypeLabels,
  formatDate,
  formatMoney,
  normalizeDeliveryType,
  normalizeOrderStatus,
  statusColors,
  statusLabels,
} from '@/lib/orders/types'

type DeliveryDetailModalProps = {
  order: OrderWithFinancials
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function DeliveryDetailModal({ order, open, onOpenChange, onEdit }: DeliveryDetailModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="delivery-detail-title" className="max-h-[100dvh] w-full overflow-y-auto bg-card sm:max-w-xl sm:rounded-xl sm:border sm:border-border">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:py-4">
          <div>
            <h2 id="delivery-detail-title" className="text-xl font-bold tracking-[-0.025em]">{order.customer_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">Solicitud {order.request_number} · {order.customer_phone}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar detalle">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[normalizeOrderStatus(order.status)]}`}>{statusLabels[normalizeOrderStatus(order.status)]}</span>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">N.º de solicitud</p>
              <p className="font-semibold">{order.request_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Deporte</p>
              <p className="font-semibold">{order.sport_name}</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatMoney(order.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span className="font-semibold">{formatMoney(order.paid_amount)}</span></div>
            <div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold">Saldo</span><span className={`font-bold ${order.balance_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatMoney(order.balance_amount)}</span></div>
          </div>

          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Entrega:</span> <span className="font-medium">{deliveryTypeLabels[normalizeDeliveryType(order.delivery_type)]}</span></p>
            <p><span className="text-muted-foreground">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Modalidad:' : 'Destino:'}</span> <span className="font-medium">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Recoge en casa · Santa Cruz' : order.destination || '-'}</span></p>
            <p><span className="text-muted-foreground">Fecha compromiso:</span> <span className="font-medium">{formatDate(order.due_date)}</span></p>
          </div>

          {order.notes ? <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">{order.notes}</p> : null}
          <Button type="button" variant="outline" className="w-full" onClick={onEdit}>Editar pedido</Button>
        </div>
      </div>
    </div>
  )
}
