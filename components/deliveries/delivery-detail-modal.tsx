'use client'

import { X } from 'lucide-react'
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
}

export function DeliveryDetailModal({ order, open, onOpenChange }: DeliveryDetailModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-card rounded-t-lg md:rounded-lg border border-border w-full md:max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border p-4 md:p-6 flex items-center justify-between sticky top-0 bg-card">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{order.customer_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">Solicitud {order.request_number} · {order.customer_phone}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition" type="button">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-5">
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
        </div>
      </div>
    </div>
  )
}
