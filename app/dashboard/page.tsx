import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getCatalogs, getFinancialSettings, getOrderPaymentsAll, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import { calculateFinanceMetrics, endOfToday, startOfMonth, type Payment } from '@/lib/finance/metrics'
import { DEFAULT_PRODUCTION_EXPENSE, DEFAULT_RESERVE_PERCENTAGE } from '@/lib/finance/calculations'
import { normalizeOrderStatus } from '@/lib/orders/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const catalogs = await getCatalogs()
  let orders: OrderWithFinancials[] = []
  let payments: Payment[] = []
  let defaultProductionExpense = DEFAULT_PRODUCTION_EXPENSE
  let reservePercentage = DEFAULT_RESERVE_PERCENTAGE
  let error = ''

  try {
    const [orderRows, paymentRows, settings] = await Promise.all([getOrders(), getOrderPaymentsAll(), getFinancialSettings()])
    orders = orderRows
    payments = paymentRows
    defaultProductionExpense = Number(settings.production_expense_default)
    reservePercentage = Number(settings.reserve_percentage)
  } catch {
    error = 'No se pudieron cargar los datos desde Supabase.'
  }

  const monthMetrics = calculateFinanceMetrics(orders, payments, [], { from: startOfMonth(), to: endOfToday() }, reservePercentage)
  const catalogError = catalogs.errors.length > 0 ? 'Algunos catálogos no pudieron cargarse desde Supabase.' : ''

  return (
    <DashboardClient
      orders={orders}
      sports={catalogs.sports}
      paymentMethods={catalogs.paymentMethods}
      defaultProductionExpense={defaultProductionExpense}
      metrics={{
        productionOrders: orders.filter((order) => normalizeOrderStatus(order.status) === 'produccion').length,
        readyOrders: orders.filter((order) => order.status === 'listo').length,
        pendingBalance: monthMetrics.pending,
        monthlySold: monthMetrics.sold,
        monthlyCollected: monthMetrics.collected,
      }}
      error={error || catalogError}
    />
  )
}
