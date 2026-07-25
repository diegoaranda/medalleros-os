import { ReportsClient } from '@/components/reports/reports-client'
import { getExpenses, getFinancialSettings, getOrderPaymentsAll, getOrders, type OrderWithFinancials } from '@/lib/data/queries'
import type { Expense, Payment } from '@/lib/finance/metrics'
import { DEFAULT_RESERVE_PERCENTAGE } from '@/lib/finance/calculations'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
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
    error = 'No se pudieron cargar los reportes desde Supabase.'
  }

  return <ReportsClient orders={orders} payments={payments} expenses={expenses} reservePercentage={reservePercentage} error={error} />
}
