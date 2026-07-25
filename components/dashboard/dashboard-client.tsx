'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hoy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => setShowNewOrderModal(true)} size="lg" className="w-full md:w-auto" disabled={sports.length === 0}>
          <Plus size={20} className="mr-2" />
          Nuevo pedido
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <DashboardCard title="En producción" value={metrics.productionOrders} subtitle="Con Eugenio" accent="orange" />
        <DashboardCard title="Listos" value={metrics.readyOrders} subtitle="Para entregar" accent="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DashboardCard title="Saldo pendiente" value={formatMoney(metrics.pendingBalance)} subtitle="Por cobrar" accent="red" />
        <DashboardCard title="Vendido este mes" value={formatMoney(metrics.monthlySold)} subtitle="Pedidos no cancelados" accent="blue" />
        <DashboardCard title="Cobrado este mes" value={formatMoney(metrics.monthlyCollected)} subtitle="Pagos registrados" accent="green" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pedidos recientes</h2>
            <Link href="/orders" className="text-primary hover:underline text-sm font-medium">Ver todos</Link>
          </div>
        </div>
        <OrdersList
          orders={orders.slice(0, 5)}
          sports={sports}
          paymentMethods={paymentMethods}
          defaultProductionExpense={defaultProductionExpense}
          maskLegacyRequestNumbers
        />
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
