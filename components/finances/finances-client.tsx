'use client'

import { useMemo, useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { ExpenseList } from '@/components/finances/expense-list'
import { FinanceCard } from '@/components/finances/finance-card'
import { RegisterExpenseModal } from '@/components/finances/register-expense-modal'
import type { Database } from '@/lib/supabase/database.types'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { calculateFinanceMetrics, endOfToday, isInRange, type Expense, type Payment } from '@/lib/finance/metrics'
import { formatMoney } from '@/lib/orders/types'

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
type MetricTone = 'slate' | 'green' | 'amber' | 'purple' | 'red'

const metricToneClasses: Record<MetricTone, string> = {
  slate: 'text-slate-950',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  purple: 'text-violet-700',
  red: 'text-red-700',
}

function FinanceMetric({ label, value, tone }: { label: string; value: string; tone: MetricTone }) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-medium leading-4 text-muted-foreground">{label}</p>
      <p className={`numeric mt-2 break-words text-xl font-bold leading-tight tracking-[-0.03em] sm:text-2xl ${metricToneClasses[tone]}`}>{value}</p>
    </div>
  )
}

type FinancesClientProps = {
  orders: OrderWithFinancials[]
  payments: Payment[]
  expenses: Expense[]
  categories: ExpenseCategory[]
  reservePercentage: number
  error?: string
}

function getMonthRange(monthValue: string) {
  if (monthValue === 'all') {
    return { from: new Date(0), to: endOfToday() }
  }

  const [year, month] = monthValue.split('-').map(Number)
  const from = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  const now = endOfToday()
  return { from, to: monthEnd > now ? now : monthEnd }
}

export function FinancesClient({ orders, payments, expenses, categories, reservePercentage, error }: FinancesClientProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [month, setMonth] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const range = useMemo(() => getMonthRange(month), [month])
  const selectedCategory = categories.find((category) => category.id === categoryId)
  const filteredExpenses = useMemo(() => expenses
    .filter((expense) => {
      const isInPeriod = isInRange(expense.expense_date, range)
      const isInCategory = categoryId === 'all' || expense.category_id === categoryId || expense.category_name === selectedCategory?.name
      return isInPeriod && isInCategory
    })
    .sort((left, right) => new Date(right.expense_date).getTime() - new Date(left.expense_date).getTime()),
  [categoryId, expenses, range, selectedCategory?.name])
  const metrics = useMemo(
    () => calculateFinanceMetrics(orders, payments, filteredExpenses, range, reservePercentage),
    [filteredExpenses, orders, payments, range, reservePercentage],
  )
  const expensesByCategory = useMemo(() => categories.map((category) => {
    const categoryExpenses = filteredExpenses.filter((expense) => expense.category_id === category.id || expense.category_name === category.name)
    return {
      category: category.name,
      total: categoryExpenses.reduce((total, expense) => total + Number(expense.amount), 0),
      count: categoryExpenses.length,
    }
  }).filter((item) => categoryId === 'all' || item.count > 0), [categories, categoryId, filteredExpenses])
  const isDefaultFilter = month === 'all' && categoryId === 'all'

  return (
    <div className="app-page">
      <PageHeader
        title="Gastos"
        eyebrow="Control operativo"
        description="Ventas, cobros, ganancia y control del fondo de producción"
        action={
          <Button onClick={() => setShowExpenseModal(true)} size="lg" className="w-full sm:w-auto" disabled={categories.length === 0}>
          <Plus size={20} className="mr-2" />
          Registrar gasto
          </Button>
        }
      />

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">{error}</div> : null}
      {categories.length === 0 ? <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground mb-6">Configura categorías de gasto para registrar gastos.</div> : null}

      <section className="surface mb-6 p-4 sm:p-5" aria-labelledby="expense-filters-title">
        <div className="mb-3">
          <h2 id="expense-filters-title" className="font-semibold text-foreground">Filtros de gastos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulta el historial por mes y categoría.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end lg:grid-cols-[minmax(11rem,0.7fr)_minmax(13rem,1fr)_auto]">
          <label>
            <span className="field-label">Período</span>
            <select value={month} onChange={(event) => setMonth(event.target.value)} className="field-control">
              <option value="all">Todos los registros</option>
              {Array.from({ length: 24 }, (_, index) => {
                const date = new Date()
                date.setDate(1)
                date.setMonth(date.getMonth() - index)
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                const label = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(date)
                return <option key={value} value={value}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
              })}
            </select>
          </label>
          <label>
            <span className="field-label">Tipo de gasto</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="field-control">
              <option value="all">Todas las categorías</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <Button type="button" variant="outline" className="md:col-span-2 lg:col-span-1" onClick={() => { setMonth('all'); setCategoryId('all') }} disabled={isDefaultFilter}>
            <RotateCcw size={16} /> Limpiar filtros
          </Button>
        </div>
      </section>

      <section className="mb-8 space-y-4" aria-labelledby="finance-summary-title">
        <h2 id="finance-summary-title" className="sr-only">Resumen financiero</h2>
        <div className="surface grid grid-cols-2 divide-x divide-y divide-border overflow-hidden lg:grid-cols-4 lg:divide-y-0">
          <FinanceMetric label="Vendido" value={formatMoney(metrics.sold)} tone="slate" />
          <FinanceMetric label="Cobrado" value={formatMoney(metrics.collected)} tone="green" />
          <FinanceMetric label="Pendiente" value={formatMoney(metrics.pending)} tone="red" />
          <FinanceMetric
            label={metrics.netProfit >= 0 ? 'Ganancia neta' : 'Pérdida neta'}
            value={formatMoney(metrics.netProfit)}
            tone={metrics.netProfit >= 0 ? 'green' : 'red'}
          />
        </div>
        <div className="surface grid grid-cols-2 divide-x divide-y divide-border overflow-hidden lg:grid-cols-4 lg:divide-y-0">
          <FinanceMetric label="Costo de Eugenio" value={formatMoney(metrics.productionCosts)} tone="amber" />
          <FinanceMetric label="Fondo de gastos de producción" value={formatMoney(metrics.productionExpenses)} tone="amber" />
          <FinanceMetric label={`Diezmo (${reservePercentage}%)`} value={formatMoney(metrics.reserveAmount)} tone="purple" />
          <FinanceMetric label="Gastos reales" value={formatMoney(metrics.expenses)} tone="slate" />
        </div>
        <div className={`overflow-hidden rounded-xl border ${metrics.availableProductionExpenseFund < 0 ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <FinanceMetric
            label={metrics.availableProductionExpenseFund < 0 ? 'Disponible para gastos · Sobregasto' : 'Disponible para gastos'}
            value={formatMoney(metrics.availableProductionExpenseFund)}
            tone={metrics.availableProductionExpenseFund < 0 ? 'red' : 'green'}
          />
        </div>
      </section>

      <div className="mb-3">
        <h2 className="text-xl font-semibold text-foreground">Gastos por categoría</h2>
        <p className="mt-1 text-sm text-muted-foreground">Distribución de gastos reales del alcance seleccionado.</p>
      </div>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {expensesByCategory.map((item) => <FinanceCard key={item.category} title={item.category} amount={item.total} count={item.count} />)}
      </div>

      <section className="surface overflow-hidden" aria-labelledby="recent-expenses-title">
        <div className="border-b border-border px-4 py-4 sm:px-5"><h2 id="recent-expenses-title" className="section-title">Historial de gastos</h2></div>
        <ExpenseList expenses={filteredExpenses} />
      </section>

      <RegisterExpenseModal open={showExpenseModal} onOpenChange={setShowExpenseModal} categories={categories} />
    </div>
  )
}
