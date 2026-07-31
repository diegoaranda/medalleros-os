'use client'

import { useState } from 'react'
import { Check, Eye, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, PaymentMethodOption } from '@/lib/orders/types'
import { formatMoney, normalizeDeliveryType } from '@/lib/orders/types'
import { DeliveryPaymentModal } from './delivery-payment-modal'
import { DeliveryDetailModal } from './delivery-detail-modal'
import { OrderFormModal } from '@/components/orders/order-form-modal'

type DeliveryCardProps = {
  order: OrderWithFinancials
  paymentMethods: PaymentMethodOption[]
  sports: CatalogOption[]
  defaultProductionExpense: number
  delivered?: boolean
}

export function DeliveryCard({ order, paymentMethods, sports, defaultProductionExpense, delivered = false }: DeliveryCardProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const phoneDigits = order.customer_phone.replace(/\D/g, '')
  const whatsappNumber = phoneDigits.length === 8 ? `591${phoneDigits}` : phoneDigits
  const whatsappHref = whatsappNumber.length >= 11 ? `https://wa.me/${whatsappNumber}` : null
  const hasBalance = Number(order.balance_amount) > 0

  return (
    <>
      <article className={`bg-card px-3 py-3 transition-colors hover:bg-muted/25 sm:px-4 ${hasBalance ? 'border-l-3 border-l-red-400' : ''} ${delivered ? 'bg-muted/35 opacity-80' : ''}`} aria-label={`${delivered ? 'Pedido entregado' : 'Pedido pendiente'} de ${order.customer_name}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="truncate font-bold">{order.customer_name}</h3>
              <span className="text-xs font-medium text-muted-foreground">· #{order.request_number}</span>
              {delivered ? <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-700">Entregado</span> : null}
              {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex size-8 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Abrir WhatsApp de ${order.customer_name}`} title="Abrir WhatsApp"><MessageCircle size={17} /></a> : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">🏅 {order.sport_name} · {normalizeDeliveryType(order.delivery_type) === 'local' ? 'Local' : order.destination || 'Envío'}</p>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 text-sm lg:justify-end">
            <p className="text-xs text-muted-foreground">Total <span className="numeric font-medium text-foreground">{formatMoney(order.total_amount)}</span></p>
            <p className="text-xs text-muted-foreground">Costo <span className="numeric font-medium text-foreground">{formatMoney(order.production_cost)}</span></p>
            <div className="min-w-24">
              <p className={`text-xs font-semibold ${hasBalance ? 'text-destructive' : 'text-emerald-700'}`}>{hasBalance ? 'Saldo pendiente' : 'Pagado'}</p>
              <p className={`numeric text-lg font-bold leading-tight ${hasBalance ? 'text-destructive' : 'text-emerald-700'}`}>{formatMoney(order.balance_amount)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowDetailModal(true)}><Eye size={16} />Ver detalle</Button>
            {!delivered ? <Button size="sm" className="bg-primary/90 hover:bg-primary" onClick={() => setShowPaymentModal(true)}><Check size={16} />Entregar pedido</Button> : null}
          </div>
        </div>
      </article>

      <DeliveryPaymentModal order={order} paymentMethods={paymentMethods} open={showPaymentModal} onOpenChange={setShowPaymentModal} onDelivered={() => window.dispatchEvent(new CustomEvent('order-delivered-success'))} />
      <DeliveryDetailModal order={order} open={showDetailModal} onOpenChange={setShowDetailModal} onEdit={() => { setShowDetailModal(false); setShowEditModal(true) }} />
      <OrderFormModal order={order} open={showEditModal} onOpenChange={setShowEditModal} sports={sports} paymentMethods={paymentMethods} defaultProductionExpense={defaultProductionExpense} />
    </>
  )
}
