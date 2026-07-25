'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, PaymentMethodOption } from '@/lib/orders/types'
import { normalizeOrderStatus, operationalOrderStatuses, statusLabels } from '@/lib/orders/types'
import { OrderFormModal } from './order-form-modal'
import { OrdersList } from './orders-list'

type StatusFilter = 'all' | OrderWithFinancials['status']

type OrdersClientProps = {
  orders: OrderWithFinancials[]
  sports: CatalogOption[]
  paymentMethods: PaymentMethodOption[]
  defaultProductionExpense: number
  error?: string
}

export function OrdersClient({ orders, sports, paymentMethods, defaultProductionExpense, error }: OrdersClientProps) {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const statuses: StatusFilter[] = ['all', ...operationalOrderStatuses]

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        order.customer_name.toLowerCase().includes(normalizedSearch) ||
        order.customer_phone.toLowerCase().includes(normalizedSearch) ||
        order.sport_name.toLowerCase().includes(normalizedSearch) ||
        order.request_number.toLowerCase().includes(normalizedSearch)

      const matchesStatus = statusFilter === 'all' || normalizeOrderStatus(order.status) === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  return (
    <div className="app-page">
      <PageHeader
        title="Pedidos"
        eyebrow="Solicitudes"
        description={`${filteredOrders.length} pedido${filteredOrders.length !== 1 ? 's' : ''} encontrado${filteredOrders.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => setShowNewOrderModal(true)} size="lg" className="w-full sm:w-auto" disabled={sports.length === 0}>
          <Plus size={20} className="mr-2" />
          Nuevo pedido
          </Button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">
          {error}
        </div>
      ) : null}

      {sports.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground mb-6">
          Configura primero al menos un deporte para crear pedidos.
        </div>
      ) : null}

      <section className="mb-5 space-y-3" aria-label="Filtros de pedidos">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <label htmlFor="order-search" className="sr-only">Buscar pedidos</label>
          <input
            id="order-search"
            type="text"
            placeholder="Buscar por N.º de solicitud, cliente, WhatsApp o deporte..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="field-control pl-11"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por estado">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                statusFilter === status ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              {status === 'all' ? 'Todos' : statusLabels[status]}
            </button>
          ))}
        </div>
      </section>

      <div className="surface overflow-hidden">
        <OrdersList orders={filteredOrders} sports={sports} paymentMethods={paymentMethods} defaultProductionExpense={defaultProductionExpense} />
      </div>

      <OrderFormModal
        open={showNewOrderModal}
        onOpenChange={setShowNewOrderModal}
        sports={sports}
        paymentMethods={paymentMethods}
        defaultProductionExpense={defaultProductionExpense}
      />
    </div>
  )
}
