'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, PaymentMethodOption } from '@/lib/orders/types'
import { formatMoney, normalizeDeliveryType } from '@/lib/orders/types'
import { DeliveryCard } from './delivery-card'

type DeliveriesClientProps = {
  readyOrders: OrderWithFinancials[]
  deliveredOrders: OrderWithFinancials[]
  paymentMethods: PaymentMethodOption[]
  sports: CatalogOption[]
  defaultProductionExpense: number
  error?: string
}

function matchesDeliverySearch(order: OrderWithFinancials, search: string) {
  return !search || [order.request_number, order.customer_name, order.sport_name, order.destination ?? ''].some((value) => value.toLowerCase().includes(search))
}

function sortOperationally(orders: OrderWithFinancials[]) {
  return [...orders].sort((left, right) => {
    const statusDifference = Number(right.status === 'listo') - Number(left.status === 'listo')
    if (statusDifference !== 0) return statusDifference
    const balanceDifference = Number(right.balance_amount > 0) - Number(left.balance_amount > 0)
    if (balanceDifference !== 0) return balanceDifference
    return right.request_number.localeCompare(left.request_number, 'es', { numeric: true })
  })
}

export function DeliveriesClient({ readyOrders, deliveredOrders, paymentMethods, sports, defaultProductionExpense, error }: DeliveriesClientProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'envio'>('local')
  const [requestFilter, setRequestFilter] = useState('')
  const [showDelivered, setShowDelivered] = useState(false)
  const [success, setSuccess] = useState('')
  const normalizedSearch = requestFilter.trim().toLowerCase()
  const filteredReadyOrders = useMemo(() => {
    return sortOperationally(readyOrders.filter((order) => matchesDeliverySearch(order, normalizedSearch)))
  }, [normalizedSearch, readyOrders])
  const localOrders = useMemo(() => filteredReadyOrders.filter((order) => normalizeDeliveryType(order.delivery_type) === 'local'), [filteredReadyOrders])
  const shippingOrders = useMemo(() => filteredReadyOrders.filter((order) => normalizeDeliveryType(order.delivery_type) === 'envio'), [filteredReadyOrders])
  const pendingBalance = filteredReadyOrders.reduce((sum, order) => sum + Number(order.balance_amount), 0)
  const filteredDeliveredOrders = useMemo(() => {
    return sortOperationally(deliveredOrders.filter((order) => matchesDeliverySearch(order, normalizedSearch)))
  }, [deliveredOrders, normalizedSearch])
  const pendingByTab = activeTab === 'local' ? localOrders : shippingOrders
  const deliveredByTab = filteredDeliveredOrders.filter((order) => normalizeDeliveryType(order.delivery_type) === activeTab)
  const visibleOrders = showDelivered ? [...pendingByTab, ...deliveredByTab] : pendingByTab
  const pendingLocalCount = localOrders.length
  const pendingShippingCount = shippingOrders.length
  const wrappedCount = filteredReadyOrders.filter((order) => order.status === 'listo').length
  const wrappingCount = filteredReadyOrders.filter((order) => order.status === 'envolver').length

  useEffect(() => {
    const handleDelivered = () => {
      setSuccess('Pedido entregado correctamente.')
      window.setTimeout(() => setSuccess(''), 5000)
    }
    window.addEventListener('order-delivered-success', handleDelivered)
    const handleWrapped = () => {
      setSuccess('Pedido envuelto y listo para entregar.')
      window.setTimeout(() => setSuccess(''), 5000)
    }
    window.addEventListener('order-wrapped-success', handleWrapped)
    return () => {
      window.removeEventListener('order-delivered-success', handleDelivered)
      window.removeEventListener('order-wrapped-success', handleWrapped)
    }
  }, [])

  return (
    <div className="app-page">
      <PageHeader title="Entregas" eyebrow="Flujo operativo" description={`${readyOrders.length} pedido${readyOrders.length !== 1 ? 's' : ''}: ${wrappedCount} envuelto${wrappedCount !== 1 ? 's' : ''} · ${wrappingCount} por envolver`} />

      {error ? <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {paymentMethods.length === 0 ? <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">Configura métodos de pago para registrar cobros desde Entregas.</div> : null}
      {success ? <div role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{success}</div> : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <label htmlFor="delivery-search" className="sr-only">Filtrar entregas por número de solicitud</label>
          <input id="delivery-search" type="text" value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)} placeholder="Filtrar por N.º de solicitud" className="field-control pl-11" />
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold"><input type="checkbox" checked={showDelivered} onChange={(event) => setShowDelivered(event.target.checked)} className="size-4" />Mostrar entregados</label>
      </div>

      <div className="surface mt-5 mb-6 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-4 sm:divide-y-0">
        <div className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="numeric mt-1 text-xl font-bold text-emerald-700 sm:text-2xl">{filteredReadyOrders.length}</p>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="numeric mt-1 break-words text-lg font-bold text-red-700 sm:text-2xl">{formatMoney(pendingBalance)}</p>
        </div>
        <div className="p-3 sm:p-4"><p className="text-xs text-muted-foreground">Envueltos</p><p className="numeric mt-1 text-xl font-bold text-emerald-700 sm:text-2xl">{wrappedCount}</p></div>
        <div className="p-3 sm:p-4"><p className="text-xs text-muted-foreground">Por envolver</p><p className="numeric mt-1 text-xl font-bold text-amber-700 sm:text-2xl">{wrappingCount}</p></div>
      </div>

      <div className="mb-4 grid grid-cols-2 border-b border-border" role="tablist" aria-label="Categorías de entrega">
        {([['local', `Locales (${pendingLocalCount})`], ['envio', `Envíos (${pendingShippingCount})`]] as const).map(([tab, label]) => <button key={tab} id={`delivery-tab-${tab}`} role="tab" aria-selected={activeTab === tab} aria-controls="delivery-tab-panel" tabIndex={activeTab === tab ? 0 : -1} type="button" onClick={() => setActiveTab(tab)} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const nextTab = tab === 'local' ? 'envio' : 'local'; setActiveTab(nextTab); document.getElementById(`delivery-tab-${nextTab}`)?.focus() } }} className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
      </div>

      <section id="delivery-tab-panel" role="tabpanel" aria-labelledby={`delivery-tab-${activeTab}`} className="surface divide-y divide-border overflow-hidden">
        {visibleOrders.length > 0 ? visibleOrders.map((order) => <DeliveryCard key={order.id} order={order} paymentMethods={paymentMethods} sports={sports} defaultProductionExpense={defaultProductionExpense} delivered={order.status === 'entregado'} />) : <EmptyState title={`No hay ${activeTab === 'local' ? 'entregas locales' : 'envíos'} para mostrar.`} description={showDelivered ? 'No hay pedidos que coincidan con los filtros activos.' : 'Los pedidos recogidos aparecerán aquí.'} />}
      </section>
    </div>
  )
}
