import { getCatalogs, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import { DeliveriesClient } from '@/components/deliveries/deliveries-client'

export const dynamic = 'force-dynamic'

export default async function DeliveriesPage() {
  const catalogs = await getCatalogs()
  let orders: OrderWithFinancials[] = []
  let error = ''

  try {
    orders = await getOrders()
  } catch {
    error = 'No se pudieron cargar los pedidos desde Supabase.'
  }

  const catalogError = catalogs.errors.length > 0 ? 'Algunos catálogos no pudieron cargarse desde Supabase.' : ''

  return (
    <DeliveriesClient
      readyOrders={orders.filter((order) => order.status === 'envolver' || order.status === 'listo')}
      deliveredOrders={orders.filter((order) => order.status === 'entregado')}
      paymentMethods={catalogs.paymentMethods}
      sports={catalogs.sports}
      defaultProductionExpense={30}
      error={error || catalogError}
    />
  )
}
