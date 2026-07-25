import type { Database } from '@/lib/supabase/database.types'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { calculateOrderFinancials } from '@/lib/finance/calculations'

export type Payment = Database['public']['Tables']['order_payments']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']

export type DateRange = {
  from: Date
  to: Date
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfWeek(date = new Date()) {
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  const start = new Date(date)
  start.setDate(date.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  return start
}

export function endOfToday(date = new Date()) {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

export function isInRange(value: string | null | undefined, range: DateRange) {
  if (!value) return false
  const date = new Date(value)
  return date >= range.from && date <= range.to
}

export function nonCancelled(order: OrderWithFinancials) {
  return order.status !== 'cancelado'
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0)
}

export function calculateFinanceMetrics(
  orders: OrderWithFinancials[],
  payments: Payment[],
  expenses: Expense[],
  range: DateRange,
  reservePercentage: number,
) {
  const periodOrders = orders.filter((order) => nonCancelled(order) && isInRange(order.created_at, range))
  const periodPayments = payments.filter((payment) => isInRange(payment.paid_at, range))
  const periodExpenses = expenses.filter((expense) => isInRange(expense.expense_date, range))

  const sold = sum(periodOrders.map((order) => order.total_amount))
  const collected = sum(periodPayments.map((payment) => payment.amount))
  const pending = sum(orders.filter(nonCancelled).map((order) => order.balance_amount))
  const productionCosts = sum(periodOrders.map((order) => order.production_cost ?? 0))
  const productionExpenses = sum(periodOrders.map((order) => order.production_expense))
  const orderFinancials = periodOrders.map((order) => calculateOrderFinancials(order, reservePercentage))
  const grossProfit = sum(orderFinancials.map((financials) => financials.gross_profit))
  const reserveAmount = sum(orderFinancials.map((financials) => financials.reserve_amount))
  const netProfit = sum(orderFinancials.map((financials) => financials.net_profit))
  const expensesTotal = sum(periodExpenses.map((expense) => expense.amount))
  const availableProductionExpenseFund = productionExpenses - expensesTotal

  return {
    sold,
    collected,
    pending,
    productionCosts,
    productionExpenses,
    grossProfit,
    reserveAmount,
    netProfit,
    expenses: expensesTotal,
    availableProductionExpenseFund,
  }
}

export function calculateReportMetrics(
  orders: OrderWithFinancials[],
  payments: Payment[],
  expenses: Expense[],
  range: DateRange,
  reservePercentage: number,
) {
  const periodOrders = orders.filter((order) => isInRange(order.created_at, range))
  const nonCancelledPeriodOrders = periodOrders.filter(nonCancelled)
  const periodOrderIds = new Set(nonCancelledPeriodOrders.map((order) => order.id))
  const periodPayments = payments.filter(
    (payment) => periodOrderIds.has(payment.order_id) && isInRange(payment.paid_at, range),
  )
  const periodExpenses = expenses.filter((expense) => isInRange(expense.expense_date, range))
  const orderFinancials = nonCancelledPeriodOrders.map((order) => calculateOrderFinancials(order, reservePercentage))
  const productionExpenseFund = sum(nonCancelledPeriodOrders.map((order) => order.production_expense))
  const actualExpenses = sum(periodExpenses.map((expense) => expense.amount))

  return {
    orders: periodOrders,
    financialOrders: nonCancelledPeriodOrders,
    totalOrders: periodOrders.length,
    deliveredOrders: periodOrders.filter((order) => order.status === 'entregado').length,
    pendingOrders: periodOrders.filter((order) => order.status !== 'entregado' && order.status !== 'cancelado').length,
    cancelledOrders: periodOrders.filter((order) => order.status === 'cancelado').length,
    sold: sum(nonCancelledPeriodOrders.map((order) => order.total_amount)),
    collected: sum(periodPayments.map((payment) => payment.amount)),
    pending: sum(nonCancelledPeriodOrders.map((order) => order.balance_amount)),
    productionCosts: sum(nonCancelledPeriodOrders.map((order) => order.production_cost ?? 0)),
    productionExpenses: productionExpenseFund,
    actualExpenses,
    availableProductionExpenseFund: productionExpenseFund - actualExpenses,
    grossProfit: sum(orderFinancials.map((financials) => financials.gross_profit)),
    reserveAmount: sum(orderFinancials.map((financials) => financials.reserve_amount)),
    netProfit: sum(orderFinancials.map((financials) => financials.net_profit)),
    savingsAmount: sum(orderFinancials.map((financials) => financials.savings_amount)),
    householdAmount: sum(orderFinancials.map((financials) => financials.household_amount)),
  }
}
