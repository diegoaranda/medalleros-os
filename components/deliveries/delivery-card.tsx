'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Eye, MessageCircle, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setProductionOrderStatus } from '@/app/production/actions'
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
  const router = useRouter()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const phoneDigits = order.customer_phone.replace(/\D/g, '')
  const whatsappNumber = phoneDigits.length === 8 ? `591${phoneDigits}` : phoneDigits
  const whatsappHref = whatsappNumber.length >= 11 ? `https://wa.me/${whatsappNumber}` : null
  const hasBalance = Number(order.balance_amount) > 0
  const hasProductionCost = Number(order.production_cost) > 0
  const isWrapping = order.status === 'envolver'
  const isWrapped = order.status === 'listo'

  const markWrapped = () => {
    setError('')
    startTransition(async () => {
      const result = await setProductionOrderStatus(order.id, 'listo')
      if (!result.ok) {
        setError(result.error)
        return
      }
      window.dispatchEvent(new CustomEvent('order-wrapped-success'))
      router.refresh()
    })
  }

  return (
    <>
      <article className={`bg-card px-3 py-3 transition-colors hover:bg-muted/25 sm:px-4 ${isWrapping ? 'border-l-3 border-l-amber-400' : ''} ${isWrapped ? 'border-l-3 border-l-emerald-500 bg-emerald-50/35' : ''} ${delivered ? 'bg-muted/35 opacity-80' : ''}`} aria-label={`${delivered ? 'Pedido entregado' : isWrapping ? 'Pedido pendiente de envolver' : 'Pedido envuelto'} de ${order.customer_name}`}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="truncate font-bold">{order.customer_name}</h3>
              <span className="text-xs font-medium text-muted-foreground">· #{order.request_number}</span>
              {delivered ? <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-700">Entregado</span> : null}
              {isWrapping ? <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800">Pendiente de envolver</span> : null}
              {isWrapped ? <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-800">Envuelto</span> : null}
              {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex size-8 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Abrir WhatsApp de ${order.customer_name}`} title="Abrir WhatsApp"><MessageCircle size={17} /></a> : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">🏅 {order.sport_name} · {normalizeDeliveryType(order.delivery_type) === 'local' ? 'Local' : order.destination || 'Envío'}</p>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 text-sm xl:justify-end">
            <p className="text-xs text-muted-foreground">Total <span className="numeric font-medium text-foreground">{formatMoney(order.total_amount)}</span></p>
            <p className="text-xs text-muted-foreground">Costo Eugenio <span className={`numeric font-semibold ${hasProductionCost ? 'text-foreground' : 'text-amber-700'}`}>{hasProductionCost ? formatMoney(order.production_cost) : 'pendiente'}</span></p>
            <div className="min-w-24">
              <p className={`text-xs font-semibold ${hasBalance ? 'text-destructive' : 'text-emerald-700'}`}>{hasBalance ? 'Saldo pendiente' : 'Pagado'}</p>
              <p className={`numeric text-lg font-bold leading-tight ${hasBalance ? 'text-destructive' : 'text-emerald-700'}`}>{formatMoney(order.balance_amount)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowDetailModal(true)}><Eye size={16} />Ver detalle</Button>
            {isWrapping ? <Button size="sm" onClick={markWrapped} disabled={isPending}><PackageCheck size={16} />{isPending ? 'Guardando…' : 'Marcar envuelto'}</Button> : null}
            {isWrapped ? <Button size="sm" className="bg-primary/90 hover:bg-primary" onClick={() => setShowPaymentModal(true)}><Check size={16} />Entregar pedido</Button> : null}
          </div>
        </div>
        {!hasProductionCost ? <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={14} />Costo Eugenio pendiente</p> : null}
        {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
      </article>

      <DeliveryPaymentModal order={order} paymentMethods={paymentMethods} open={showPaymentModal} onOpenChange={setShowPaymentModal} onDelivered={() => window.dispatchEvent(new CustomEvent('order-delivered-success'))} />
      <DeliveryDetailModal order={order} open={showDetailModal} onOpenChange={setShowDetailModal} onEdit={() => { setShowDetailModal(false); setShowEditModal(true) }} />
      <OrderFormModal order={order} open={showEditModal} onOpenChange={setShowEditModal} sports={sports} paymentMethods={paymentMethods} defaultProductionExpense={defaultProductionExpense} />
    </>
  )
}
