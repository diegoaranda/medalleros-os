'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, DollarSign, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateOrderStatus } from '@/app/orders/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { PaymentMethodOption } from '@/lib/orders/types'
import { formatMoney, normalizeDeliveryType } from '@/lib/orders/types'
import { DeliveryPaymentModal } from './delivery-payment-modal'
import { DeliveryDetailModal } from './delivery-detail-modal'

type DeliveryCardProps = {
  order: OrderWithFinancials
  paymentMethods: PaymentMethodOption[]
}

export function DeliveryCard({ order, paymentMethods }: DeliveryCardProps) {
  const router = useRouter()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const markDelivered = () => {
    setError('')
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, 'entregado')

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <>
      <div className={`rounded-lg border p-4 transition bg-card border-border hover:shadow-lg ${order.balance_amount > 0 ? 'ring-1 ring-red-200 dark:ring-red-900/40' : ''}`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">N.º de solicitud</p><p className="font-semibold">{order.request_number}</p></div>
          <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-semibold">{order.customer_name}</p></div>
          <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="font-semibold">{order.customer_phone}</p></div>
          <div><p className="text-xs text-muted-foreground">Deporte</p><p className="font-semibold">{order.sport_name}</p></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{formatMoney(order.total_amount)}</p></div>
          <div><p className="text-xs text-muted-foreground">Saldo pendiente</p><p className={`font-bold ${order.balance_amount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatMoney(order.balance_amount)}</p></div>
          <div className="col-span-2 md:col-span-3">
            <p className="text-xs text-muted-foreground">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Modalidad' : 'Destino'}</p>
            <p className="font-semibold">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Recoge en casa · Santa Cruz' : order.destination || '-'}</p>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(true)} className="flex-1" disabled={isPending || order.balance_amount <= 0 || paymentMethods.length === 0}>
              <DollarSign size={16} className="mr-1" />
              Registrar pago
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDetailModal(true)} className="flex-1" disabled={isPending}>
            <Eye size={16} className="mr-1" />
            Ver detalle
          </Button>
          <Button size="sm" onClick={markDelivered} className="flex-1" disabled={isPending}>
            <Check size={16} className="mr-1" />
            {isPending ? 'Guardando...' : 'Marcar entregado'}
          </Button>
        </div>
      </div>

      <DeliveryPaymentModal order={order} paymentMethods={paymentMethods} open={showPaymentModal} onOpenChange={setShowPaymentModal} />
      <DeliveryDetailModal order={order} open={showDetailModal} onOpenChange={setShowDetailModal} />
    </>
  )
}
