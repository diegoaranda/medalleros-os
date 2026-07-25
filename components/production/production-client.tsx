'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Producción</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona el flujo de producción con Eugenio</p>
      </div>

      {error ? <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

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

      <div className="mt-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-400 dark:bg-slate-600/40 text-slate-900 dark:text-slate-100 font-bold text-sm">1</div>
            <h2 className="text-xl font-bold text-foreground">En Producción</h2>
            <span className="ml-auto bg-slate-300 dark:bg-slate-700/40 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full text-sm font-semibold">{filteredProductionOrders.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProductionOrders.length > 0 ? filteredProductionOrders.map((order) => <ProductionCard key={order.id} order={order} reservePercentage={reservePercentage} />) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">No hay pedidos en producción</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
