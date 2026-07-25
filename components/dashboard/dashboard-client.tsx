'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { DashboardCard } from '@/components/dashboard/dashboard-card'
import { OrderFormModal } from '@/components/orders/order-form-modal'
import { OrdersList } from '@/components/orders/orders-list'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, PaymentMethodOption } from '@/lib/orders/types'
import { formatMoney } from '@/lib/orders/types'

type DashboardClientProps = {
  orders: OrderWithFinancials[]
  sports: CatalogOption[]
  paymentMethods: PaymentMethodOption[]
  defaultProductionExpense: number
  metrics: {
    productionOrders: number
    readyOrders: number
    pendingBalance: number
    monthlySold: number
    monthlyCollected: number
  }
  error?: string
}

export function DashboardClient({ orders, sports, paymentMethods, defaultProductionExpense, metrics, error }: DashboardClientProps) {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)

  return (
    <div className="app-page">
      <PageHeader
        title="Hoy"
        eyebrow="Resumen operativo"
        description={new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        action={
          <Button onClick={() => setShowNewOrderModal(true)} size="lg" className="w-full sm:w-auto" disabled={sports.length === 0}>
          <Plus size={20} className="mr-2" />
          Nuevo pedido
          </Button>
        }
      />

      {error ? <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <section aria-label="Prioridades de hoy" className="surface mb-5 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-5 sm:divide-y-0">
        <DashboardCard title="En producción" value={metrics.productionOrders} subtitle="Con Eugenio" accent="orange" />
        <DashboardCard title="Listos" value={metrics.readyOrders} subtitle="Para entregar" accent="green" />
        <DashboardCard title="Saldo pendiente" value={formatMoney(metrics.pendingBalance)} subtitle="Por cobrar" accent="red" />
        <DashboardCard title="Vendido este mes" value={formatMoney(metrics.monthlySold)} subtitle="Pedidos no cancelados" accent="blue" />
        <DashboardCard title="Cobrado este mes" value={formatMoney(metrics.monthlyCollected)} subtitle="Pagos registrados" accent="green" />
      </section>

      <section className="surface overflow-hidden" aria-labelledby="recent-orders-title">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <h2 id="recent-orders-title" className="section-title">Pedidos recientes</h2>
          </div>
          <Link href="/orders" className="rounded-md px-2 py-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver todos</Link>
        </div>
        <OrdersList
          orders={orders.slice(0, 5)}
          sports={sports}
          paymentMethods={paymentMethods}
          defaultProductionExpense={defaultProductionExpense}
          maskLegacyRequestNumbers
        />
      </section>

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
