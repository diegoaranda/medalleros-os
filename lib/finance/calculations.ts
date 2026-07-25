export const DEFAULT_PRODUCTION_EXPENSE = 30
export const DEFAULT_RESERVE_PERCENTAGE = 10

export type FinancialSettings = {
  production_expense_default: number
  reserve_percentage: number
}

export type FinancialOrderInput = {
  total_amount: number
  production_cost: number | null
  production_expense: number
}

export type OrderFinancials = {
  initial_profit: number
  profit_margin: number
  gross_profit: number
  reserve_amount: number
  net_profit: number
  savings_amount: number
  household_amount: number
}

export function normalizeReservePercentage(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_RESERVE_PERCENTAGE
  return Math.min(Math.max(value, 0), 100)
}

export function calculateOrderFinancials(
  order: FinancialOrderInput,
  reservePercentage: number,
): OrderFinancials {
  const totalAmount = Number(order.total_amount) || 0
  const productionCost = Number(order.production_cost) || 0
  const productionExpense = Number(order.production_expense) || 0
  const initialProfit = totalAmount - productionCost
  const grossProfit = initialProfit - productionExpense
  const reserveAmount = Math.max(grossProfit, 0) * (normalizeReservePercentage(reservePercentage) / 100)
  const netProfit = grossProfit - reserveAmount
  const savingsAmount = netProfit > 0 ? netProfit * 0.3 : 0
  const householdAmount = netProfit > 0 ? netProfit - savingsAmount : 0

  return {
    initial_profit: initialProfit,
    profit_margin: totalAmount > 0 ? initialProfit / totalAmount : 0,
    gross_profit: grossProfit,
    reserve_amount: reserveAmount,
    net_profit: netProfit,
    savings_amount: savingsAmount,
    household_amount: householdAmount,
  }
}
