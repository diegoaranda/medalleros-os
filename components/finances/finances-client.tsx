'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExpenseList } from '@/components/finances/expense-list'
import { FinanceCard } from '@/components/finances/finance-card'
import { RegisterExpenseModal } from '@/components/finances/register-expense-modal'
import type { Database } from '@/lib/supabase/database.types'
import type { Expense } from '@/lib/finance/metrics'
import { formatMoney } from '@/lib/orders/types'

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
type MetricTone = 'slate' | 'green' | 'amber' | 'purple' | 'red'

const metricToneClasses: Record<MetricTone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-100',
  green: 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100',
  amber: 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100',
  purple: 'border-violet-200 bg-violet-50/70 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-100',
  red: 'border-rose-200 bg-rose-50/70 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-100',
}

function FinanceMetric({ label, value, tone }: { label: string; value: string; tone: MetricTone }) {
  return (
    <div className={`rounded-xl border p-4 md:p-5 ${metricToneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
    </div>
  )
}

type FinancesClientProps = {
  expenses: Expense[]
  categories: ExpenseCategory[]
  metrics: {
    sold: number
    collected: number
    pending: number
    productionCosts: number
    productionExpenses: number
    grossProfit: number
    reserveAmount: number
    netProfit: number
    expenses: number
    availableProductionExpenseFund: number
  }
  reservePercentage: number
  error?: string
}

export function FinancesClient({ expenses, categories, metrics, reservePercentage, error }: FinancesClientProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const expensesByCategory = useMemo(() => categories.map((category) => {
    const categoryExpenses = expenses.filter((expense) => expense.category_id === category.id || expense.category_name === category.name)
    return {
      category: category.name,
      total: categoryExpenses.reduce((total, expense) => total + Number(expense.amount), 0),
      count: categoryExpenses.length,
    }
  }), [categories, expenses])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finanzas</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen mensual y gastos</p>
        </div>
        <Button onClick={() => setShowExpenseModal(true)} size="lg" className="w-full md:w-auto" disabled={categories.length === 0}>
          <Plus size={20} className="mr-2" />
          Registrar gasto
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">{error}</div> : null}
      {categories.length === 0 ? <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground mb-6">Configura categorías de gasto para registrar gastos.</div> : null}

      <div className="mb-8 space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FinanceMetric label="Vendido" value={formatMoney(metrics.sold)} tone="slate" />
          <FinanceMetric label="Cobrado" value={formatMoney(metrics.collected)} tone="green" />
          <FinanceMetric label="Pendiente" value={formatMoney(metrics.pending)} tone="red" />
          <FinanceMetric
            label={metrics.netProfit >= 0 ? 'Ganancia neta' : 'Pérdida neta'}
            value={formatMoney(metrics.netProfit)}
            tone={metrics.netProfit >= 0 ? 'green' : 'red'}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FinanceMetric label="Costo Eugenio" value={formatMoney(metrics.productionCosts)} tone="amber" />
          <FinanceMetric label="Fondo de gastos de producción" value={formatMoney(metrics.productionExpenses)} tone="amber" />
          <FinanceMetric label={`Diezmo (${reservePercentage}%)`} value={formatMoney(metrics.reserveAmount)} tone="purple" />
          <FinanceMetric label="Gastos reales" value={formatMoney(metrics.expenses)} tone="slate" />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <FinanceMetric
            label={metrics.availableProductionExpenseFund < 0 ? 'Disponible para gastos · Sobregasto' : 'Disponible para gastos'}
            value={formatMoney(metrics.availableProductionExpenseFund)}
            tone={metrics.availableProductionExpenseFund < 0 ? 'red' : 'green'}
          />
        </div>
      </div>

      <div className="mb-3">
        <h2 className="text-xl font-semibold text-foreground">Gastos por categoría</h2>
        <p className="mt-1 text-sm text-muted-foreground">Distribución de gastos reales del mes.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {expensesByCategory.map((item) => <FinanceCard key={item.category} title={item.category} amount={item.total} count={item.count} />)}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border"><h2 className="text-xl font-semibold">Gastos recientes</h2></div>
        <ExpenseList expenses={expenses} />
      </div>

      <RegisterExpenseModal open={showExpenseModal} onOpenChange={setShowExpenseModal} categories={categories} />
    </div>
  )
}
