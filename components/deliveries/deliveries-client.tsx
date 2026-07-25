'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {readyOrders.length} pedido{readyOrders.length !== 1 ? 's' : ''} listo{readyOrders.length !== 1 ? 's' : ''} para entregar
        </p>
      </div>

      {error ? <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {paymentMethods.length === 0 ? <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">Configura métodos de pago para registrar cobros desde Entregas.</div> : null}

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          value={requestFilter}
          onChange={(event) => setRequestFilter(event.target.value)}
          placeholder="Filtrar por N.º de solicitud"
          className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Listos para Entregar</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{filteredReadyOrders.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Saldo Pendiente</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatMoney(pendingBalance)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Pedidos Entregados</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{deliveredOrders.length}</p>
        </div>
      </div>

      <div className="space-y-10">
        <section>
          <div className="mb-4 flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Local — Santa Cruz</h2>
              <p className="text-sm text-muted-foreground">Recoge en casa · Santa Cruz</p>
            </div>
            <span className="text-sm font-semibold text-foreground">Locales pendientes: {localOrders.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {localOrders.length > 0 ? localOrders.map((order) => (
              <DeliveryCard key={order.id} order={order} paymentMethods={paymentMethods} />
            )) : <p className="py-6 text-center text-muted-foreground xl:col-span-2">No hay entregas locales pendientes.</p>}
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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {shippingOrders.length > 0 ? shippingOrders.map((order) => (
              <DeliveryCard key={order.id} order={order} paymentMethods={paymentMethods} />
            )) : <p className="py-6 text-center text-muted-foreground xl:col-span-2">No hay envíos pendientes.</p>}
          </div>
        </section>

        {filteredReadyOrders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p className="text-lg">No hay pedidos listos para entregar</p>
            <p className="text-sm mt-2">Los pedidos en producción aparecerán aquí cuando estén listos</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
