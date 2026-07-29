'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { ProductionCard } from './production-card'

type ProductionClientProps = {
  productionOrders: OrderWithFinancials[]
  reservePercentage: number
  error?: string
}

export function ProductionClient({ productionOrders, reservePercentage, error }: ProductionClientProps) {
  const [requestFilter, setRequestFilter] = useState('')
  const normalizedFilter = requestFilter.trim().toLowerCase()
  const filteredProductionOrders = useMemo(
    () => productionOrders.filter((order) => !normalizedFilter || order.request_number.toLowerCase().includes(normalizedFilter)),
    [normalizedFilter, productionOrders],
  )

  return (
    <div className="app-page">
      <PageHeader title="Producción" eyebrow="Cola operativa" description="Costos y pedidos activos con Eugenio" />

      {error ? <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <label htmlFor="production-search" className="sr-only">Filtrar producción por número de solicitud</label>
        <input
          id="production-search"
          type="text"
          value={requestFilter}
          onChange={(event) => setRequestFilter(event.target.value)}
          placeholder="Filtrar por N.º de solicitud"
          className="field-control pl-11"
        />
      </div>

      <section aria-labelledby="production-title">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="production-title" className="section-title">En producción</h2>
            <p className="mt-1 text-sm text-muted-foreground">Completa la información pendiente antes de pasar a Entregas.</p>
          </div>
          <span className="numeric rounded-md bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-800" aria-label={`${filteredProductionOrders.length} pedidos`}>
            {filteredProductionOrders.length}
          </span>
        </div>
        <div className="surface divide-y divide-border overflow-hidden">
          {filteredProductionOrders.length > 0 ? filteredProductionOrders.map((order) => <ProductionCard key={order.id} order={order} reservePercentage={reservePercentage} />) : (
            <EmptyState title="No hay pedidos en producción." description="Los pedidos nuevos aparecerán aquí automáticamente." />
          )}
        </div>
      </section>
    </div>
  )
}
