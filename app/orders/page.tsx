import { getCatalogs, getFinancialSettings, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import { OrdersClient } from '@/components/orders/orders-client'
import { DEFAULT_PRODUCTION_EXPENSE } from '@/lib/finance/calculations'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const catalogs = await getCatalogs()
  let orders: OrderWithFinancials[] = []
  let defaultProductionExpense = DEFAULT_PRODUCTION_EXPENSE
  let error = ''

  try {
    const [orderRows, financialSettings] = await Promise.all([getOrders(), getFinancialSettings()])
    orders = orderRows
    defaultProductionExpense = Number(financialSettings.production_expense_default)
  } catch {
    error = 'No se pudieron cargar los pedidos desde Supabase.'
  }

  const catalogError = catalogs.errors.length > 0 ? 'Algunos catálogos no pudieron cargarse desde Supabase.' : ''

  return (
    <OrdersClient
      orders={orders}
      sports={catalogs.sports}
      paymentMethods={catalogs.paymentMethods}
      defaultProductionExpense={defaultProductionExpense}
      error={error || catalogError}
    />
  )
}
