import { FinancesClient } from '@/components/finances/finances-client'
import { getCatalogs, getExpenses, getFinancialSettings, getOrderPaymentsAll, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import { calculateFinanceMetrics, endOfToday, startOfMonth, type Expense, type Payment } from '@/lib/finance/metrics'
import { DEFAULT_RESERVE_PERCENTAGE } from '@/lib/finance/calculations'

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
    error = 'No se pudieron cargar las finanzas desde Supabase.'
  }

  const monthRange = { from: startOfMonth(), to: endOfToday() }
  const metrics = calculateFinanceMetrics(orders, payments, expenses, monthRange, reservePercentage)
  const monthExpenses = expenses.filter((expense) => new Date(expense.expense_date) >= monthRange.from && new Date(expense.expense_date) <= monthRange.to)
  const catalogError = catalogs.errors.length > 0 ? 'Algunas categorías no pudieron cargarse desde Supabase.' : ''

  return (
    <FinancesClient
      expenses={monthExpenses}
      categories={catalogs.expenseCategories}
      metrics={metrics}
      reservePercentage={reservePercentage}
      error={error || catalogError}
    />
  )
}
