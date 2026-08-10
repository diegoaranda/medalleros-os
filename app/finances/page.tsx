import { FinancesClient } from '@/components/finances/finances-client'
import { getCatalogs, getExpenses, getFinancialSettings, getOrderPaymentsAll, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import { DEFAULT_RESERVE_PERCENTAGE } from '@/lib/finance/calculations'
import type { Expense, Payment } from '@/lib/finance/metrics'

export const dynamic = 'force-dynamic'

export default async function FinancesPage() {
  const catalogs = await getCatalogs()
  let orders: OrderWithFinancials[] = []
  let payments: Payment[] = []
  let expenses: Expense[] = []
  let reservePercentage = DEFAULT_RESERVE_PERCENTAGE
  let error = ''

  try {
    const [orderRows, paymentRows, expenseRows, settings] = await Promise.all([
      getOrders(),
      getOrderPaymentsAll(),
      getExpenses(),
      getFinancialSettings(),
    ])
    orders = orderRows
    payments = paymentRows
    expenses = expenseRows
    reservePercentage = Number(settings.reserve_percentage)
  } catch {
    error = 'No se pudieron cargar los gastos desde Supabase.'
  }

  const catalogError = catalogs.errors.length > 0 ? 'Algunas categorías no pudieron cargarse desde Supabase.' : ''

  return (
    <FinancesClient
      orders={orders}
      payments={payments}
      expenses={expenses}
      categories={catalogs.expenseCategories}
      reservePercentage={reservePercentage}
      error={error || catalogError}
    />
  )
}
