'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { PaymentMethodOption } from '@/lib/orders/types'
import { formatMoney, normalizeDeliveryType } from '@/lib/orders/types'
import { DeliveryCard } from './delivery-card'

type DeliveriesClientProps = {
  readyOrders: OrderWithFinancials[]
  deliveredOrders: OrderWithFinancials[]
  paymentMethods: PaymentMethodOption[]
  error?: string
}

export function DeliveriesClient({ readyOrders, deliveredOrders, paymentMethods, error }: DeliveriesClientProps) {
  const [requestFilter, setRequestFilter] = useState('')
  const filteredReadyOrders = useMemo(() => {
    const normalized = requestFilter.trim().toLowerCase()
    return readyOrders.filter((order) => !normalized || order.request_number.toLowerCase().includes(normalized))
  }, [readyOrders, requestFilter])
  const localOrders = filteredReadyOrders.filter((order) => normalizeDeliveryType(order.delivery_type) === 'local')
  const shippingOrders = filteredReadyOrders.filter((order) => normalizeDeliveryType(order.delivery_type) === 'envio')
  const pendingBalance = filteredReadyOrders.reduce((sum, order) => sum + Number(order.balance_amount), 0)

  return (
    <div className="app-page">
      <PageHeader title="Entregas" eyebrow="Pedidos listos" description={`${readyOrders.length} pedido${readyOrders.length !== 1 ? 's' : ''} pendiente${readyOrders.length !== 1 ? 's' : ''} de entrega`} />

      {error ? <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {paymentMethods.length === 0 ? <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">Configura métodos de pago para registrar cobros desde Entregas.</div> : null}

      <div className="relative mt-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <label htmlFor="delivery-search" className="sr-only">Filtrar entregas por número de solicitud</label>
        <input
          id="delivery-search"
          type="text"
          value={requestFilter}
          onChange={(event) => setRequestFilter(event.target.value)}
          placeholder="Filtrar por N.º de solicitud"
          className="field-control pl-11"
        />
      </div>

      <div className="surface mt-5 mb-8 grid grid-cols-3 divide-x divide-border overflow-hidden">
        <div className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Listos</p>
          <p className="numeric mt-1 text-xl font-bold text-emerald-700 sm:text-2xl">{filteredReadyOrders.length}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="numeric mt-1 break-words text-lg font-bold text-red-700 sm:text-2xl">{formatMoney(pendingBalance)}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Entregados</p>
          <p className="numeric mt-1 text-xl font-bold sm:text-2xl">{deliveredOrders.length}</p>
        </div>
      </div>

      <div className="space-y-9">
        <section>
          <div className="mb-4 flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Local — Santa Cruz</h2>
              <p className="text-sm text-muted-foreground">Recoge en casa · Santa Cruz</p>
            </div>
            <span className="text-sm font-semibold text-foreground">Locales pendientes: {localOrders.length}</span>
          </div>
          <div className="surface divide-y divide-border overflow-hidden">
            {localOrders.length > 0 ? localOrders.map((order) => (
              <DeliveryCard key={order.id} order={order} paymentMethods={paymentMethods} />
            )) : <EmptyState title="No hay entregas locales pendientes." description="Los pedidos locales listos aparecerán en este grupo." />}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Envíos fuera de Santa Cruz</h2>
              <p className="text-sm text-muted-foreground">Pedidos con destino de envío registrado</p>
            </div>
            <span className="text-sm font-semibold text-foreground">Envíos pendientes: {shippingOrders.length}</span>
          </div>
          <div className="surface divide-y divide-border overflow-hidden">
            {shippingOrders.length > 0 ? shippingOrders.map((order) => (
              <DeliveryCard key={order.id} order={order} paymentMethods={paymentMethods} />
            )) : <EmptyState title="No hay envíos pendientes." description="Los pedidos con destino fuera de Santa Cruz aparecerán aquí." />}
          </div>
        </section>

      </div>
    </div>
  )
}
