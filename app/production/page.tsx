import { getCatalogs, getFinancialSettings, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import { ProductionClient } from '@/components/production/production-client'
import { DEFAULT_RESERVE_PERCENTAGE } from '@/lib/finance/calculations'
import { normalizeOrderStatus } from '@/lib/orders/types'

export const dynamic = 'force-dynamic'

export default async function ProductionPage() {
  let orders: OrderWithFinancials[] = []
  let reservePercentage = DEFAULT_RESERVE_PERCENTAGE
  let error = ''
  const catalogs = await getCatalogs()

  try {
    const [orderRows, settings] = await Promise.all([getOrders(), getFinancialSettings()])
    orders = orderRows
    reservePercentage = Number(settings.reserve_percentage)
  } catch {
    error = 'No se pudieron cargar los pedidos desde Supabase.'
  }

  return (
    <ProductionClient
      productionOrders={orders.filter((order) => normalizeOrderStatus(order.status) === 'produccion')}
      reservePercentage={reservePercentage}
      sports={catalogs.sports}
      paymentMethods={catalogs.paymentMethods}
      defaultProductionExpense={30}
      error={error}
    />
  )
}
