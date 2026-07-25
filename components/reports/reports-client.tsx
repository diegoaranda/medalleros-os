'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  LoaderCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportChart } from '@/components/reports/report-chart'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { calculateOrderFinancials } from '@/lib/finance/calculations'
import type { Expense, Payment } from '@/lib/finance/metrics'
import { calculateReportMetrics, endOfToday, startOfMonth, startOfWeek } from '@/lib/finance/metrics'
import { exportReportToExcel } from '@/lib/reports/excel-export'
import {
  deliveryTypeLabels,
  formatMoney,
  normalizeDeliveryType,
  normalizeOrderStatus,
  operationalDeliveryTypes,
  operationalOrderStatuses,
  statusLabels,
} from '@/lib/orders/types'

type ReportPeriod = 'week' | 'month' | 'custom'
type StatusFilter = 'all' | OrderWithFinancials['status']
type DeliveryFilter = 'all' | OrderWithFinancials['delivery_type']
type MetricTone = 'slate' | 'green' | 'amber' | 'purple' | 'red'
type ExportState = 'idle' | 'exporting' | 'success' | 'error'

type ReportsClientProps = {
  orders: OrderWithFinancials[]
  payments: Payment[]
  expenses: Expense[]
  reservePercentage: number
  error?: string
}

type MetricCardProps = {
  label: string
  value: string | number
  tone?: MetricTone
  helper?: string
}

const toneClasses: Record<MetricTone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-100',
  green: 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100',
  amber: 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100',
  purple: 'border-violet-200 bg-violet-50/70 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-100',
  red: 'border-rose-200 bg-rose-50/70 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-100',
}

const inputClasses =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

function MetricCard({ label, value, tone = 'slate', helper }: MetricCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs opacity-65">{helper}</p> : null}
    </div>
  )
}

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromInput(value: string, endOfDay = false) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date()
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

function SavingsDistribution({ savings, household }: { savings: number; household: number }) {
  const distributable = savings + household

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Solo se distribuyen pedidos con ganancia positiva.</p>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {formatMoney(distributable)}
        </span>
      </div>

      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted">
        {distributable > 0 ? (
          <>
            <div className="w-[30%] bg-emerald-400/70 dark:bg-emerald-500/60" title="Ahorro 30%" />
            <div className="w-[70%] bg-slate-400/70 dark:bg-slate-500/70" title="Casa 70%" />
          </>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Ahorro 30%</p>
          <p className="mt-1 font-bold text-emerald-950 dark:text-emerald-100">{formatMoney(savings)}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/50">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Casa 70%</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-slate-100">{formatMoney(household)}</p>
        </div>
      </div>
    </div>
  )
}

export function ReportsClient({ orders, payments, expenses, reservePercentage, error }: ReportsClientProps) {
  const today = useMemo(() => new Date(), [])
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [customFrom, setCustomFrom] = useState(() => dateInputValue(startOfMonth(today)))
  const [customTo, setCustomTo] = useState(() => dateInputValue(today))
  const [requestFilter, setRequestFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sportFilter, setSportFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all')
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(() => new Set())
  const [exportState, setExportState] = useState<ExportState>('idle')

  const requestNumbers = useMemo(
    () => Array.from(new Set(orders.map((order) => order.request_number))).sort(
      (a, b) => a.localeCompare(b, 'es', { numeric: true }),
    ),
    [orders],
  )
  const sports = useMemo(
    () => Array.from(new Set(orders.map((order) => order.sport_name))).sort((a, b) => a.localeCompare(b, 'es')),
    [orders],
  )
  const range = useMemo(() => {
    if (period === 'week') return { from: startOfWeek(today), to: endOfToday(today) }
    if (period === 'month') return { from: startOfMonth(today), to: endOfToday(today) }
    return {
      from: dateFromInput(customFrom),
      to: dateFromInput(customTo, true),
    }
  }, [customFrom, customTo, period, today])

  const ordersMatchingAttributes = useMemo(() => {
    const normalizedRequest = requestFilter.trim().toLocaleLowerCase('es')

    return orders.filter((order) => {
      const matchesRequest =
        !normalizedRequest || order.request_number.toLocaleLowerCase('es').includes(normalizedRequest)
      const matchesStatus = statusFilter === 'all' || normalizeOrderStatus(order.status) === statusFilter
      const matchesSport = sportFilter === 'all' || order.sport_name === sportFilter
      const matchesDelivery = deliveryFilter === 'all' || normalizeDeliveryType(order.delivery_type) === deliveryFilter
      return matchesRequest && matchesStatus && matchesSport && matchesDelivery
    })
  }, [deliveryFilter, orders, requestFilter, sportFilter, statusFilter])

  const metrics = useMemo(
    () => calculateReportMetrics(ordersMatchingAttributes, payments, expenses, range, reservePercentage),
    [expenses, ordersMatchingAttributes, payments, range, reservePercentage],
  )
  const exactRequest = useMemo(() => {
    const normalized = requestFilter.trim().toLocaleLowerCase('es')
    return requestNumbers.find((requestNumber) => requestNumber.toLocaleLowerCase('es') === normalized) ?? null
  }, [requestFilter, requestNumbers])
  const exportOrders = useMemo(
    () => statusFilter === 'cancelado'
      ? metrics.orders.filter((order) => order.status === 'cancelado')
      : metrics.financialOrders,
    [metrics.financialOrders, metrics.orders, statusFilter],
  )

  const statusCounts = useMemo(
    () => operationalOrderStatuses.map((status) => ({
      name: statusLabels[status],
      count: metrics.orders.filter((order) => normalizeOrderStatus(order.status) === status).length,
    })),
    [metrics.orders],
  )
  const deliveryCounts = useMemo(
    () => operationalDeliveryTypes.map((type) => ({
      name: deliveryTypeLabels[type],
      count: metrics.orders.filter((order) => normalizeDeliveryType(order.delivery_type) === type).length,
    })),
    [metrics.orders],
  )
  const sportCounts = useMemo(
    () => Array.from(new Set(metrics.orders.map((order) => order.sport_name)))
      .map((sport) => ({
        name: sport,
        count: metrics.orders.filter((order) => order.sport_name === sport).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    [metrics.orders],
  )

  const resetFilters = () => {
    setPeriod('month')
    setCustomFrom(dateInputValue(startOfMonth(today)))
    setCustomTo(dateInputValue(today))
    setRequestFilter('')
    setStatusFilter('all')
    setSportFilter('all')
    setDeliveryFilter('all')
    setExportState('idle')
  }

  const handleRequestChange = (value: string) => {
    setRequestFilter(value === 'Todas las solicitudes' ? '' : value)
    setExportState('idle')
  }

  const toggleOrderDetail = (orderId: string) => {
    setExpandedOrderIds((current) => {
      const next = new Set(current)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const handleExport = async () => {
    setExportState('exporting')
    try {
      const periodLabel = period === 'week'
        ? 'Esta semana'
        : period === 'month'
          ? 'Este mes'
          : `${customFrom || 'Sin fecha'} al ${customTo || 'Sin fecha'}`

      await exportReportToExcel({
        orders: exportOrders,
        summary: metrics,
        filters: {
          period: periodLabel,
          requestNumber: exactRequest ?? (requestFilter.trim() || 'Todas las solicitudes'),
          status: statusFilter === 'all' ? 'Todos los estados' : statusLabels[statusFilter],
          sport: sportFilter === 'all' ? 'Todos los deportes' : sportFilter,
          deliveryType: deliveryFilter === 'all' ? 'Todos los tipos' : deliveryTypeLabels[deliveryFilter],
        },
        range,
        reservePercentage,
        selectedRequest: exactRequest,
      })
      setExportState('success')
    } catch (exportError) {
      console.error('No se pudo exportar el reporte.', exportError)
      setExportState('error')
    }
  }

  const netProfitTone: MetricTone = metrics.netProfit < 0 ? 'red' : 'green'

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">
      <section className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Analiza solicitudes, resultados y distribución de ganancias.</p>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Filtros</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportState === 'exporting'}
                aria-live="polite"
              >
                {exportState === 'exporting' ? <LoaderCircle size={15} className="mr-2 animate-spin" /> : null}
                {exportState === 'success' ? <CheckCircle2 size={15} className="mr-2 text-emerald-600" /> : null}
                {exportState === 'error' ? <AlertCircle size={15} className="mr-2 text-destructive" /> : null}
                {exportState === 'idle' ? <Download size={15} className="mr-2" /> : null}
                {exportState === 'exporting'
                  ? 'Exportando...'
                  : exportState === 'success'
                    ? 'Excel exportado'
                    : exportState === 'error'
                      ? 'Error al exportar'
                      : 'Exportar Excel'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw size={15} className="mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['week', 'month', 'custom'] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setPeriod(item)
                  setExportState('idle')
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  period === item
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
                type="button"
              >
                {item === 'week' ? 'Esta semana' : item === 'month' ? 'Este mes' : 'Personalizado'}
              </button>
            ))}
          </div>

          {period === 'custom' ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                Desde
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(event) => {
                    setCustomFrom(event.target.value)
                    setExportState('idle')
                  }}
                  className={`${inputClasses} mt-1`}
                />
              </label>
              <label className="text-sm text-muted-foreground">
                Hasta
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(event) => {
                    setCustomTo(event.target.value)
                    setExportState('idle')
                  }}
                  className={`${inputClasses} mt-1`}
                />
              </label>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-muted-foreground">
              N.º de solicitud
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  list="report-request-numbers"
                  value={requestFilter}
                  onChange={(event) => handleRequestChange(event.target.value)}
                  placeholder="Todas las solicitudes"
                  className={`${inputClasses} pl-9`}
                  autoComplete="off"
                />
                <datalist id="report-request-numbers">
                  <option value="Todas las solicitudes" />
                  {requestNumbers.map((requestNumber) => (
                    <option key={requestNumber} value={requestNumber} />
                  ))}
                </datalist>
              </div>
            </label>

            <label className="text-sm text-muted-foreground">
              Estado
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter)
                  setExportState('idle')
                }}
                className={`${inputClasses} mt-1`}
              >
                <option value="all">Todos los estados</option>
                {operationalOrderStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-muted-foreground">
              Deporte
              <select
                value={sportFilter}
                onChange={(event) => {
                  setSportFilter(event.target.value)
                  setExportState('idle')
                }}
                className={`${inputClasses} mt-1`}
              >
                <option value="all">Todos los deportes</option>
                {sports.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
              </select>
            </label>

            <label className="text-sm text-muted-foreground">
              Tipo de entrega
              <select
                value={deliveryFilter}
                onChange={(event) => {
                  setDeliveryFilter(event.target.value as DeliveryFilter)
                  setExportState('idle')
                }}
                className={`${inputClasses} mt-1`}
              >
                <option value="all">Todos los tipos</option>
                {operationalDeliveryTypes.map((type) => (
                  <option key={type} value={type}>{deliveryTypeLabels[type]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {exactRequest ? (
        <section className="flex flex-col gap-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold text-slate-950 dark:text-slate-100">Resumen de Solicitud {exactRequest}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {metrics.totalOrders} medallero{metrics.totalOrders === 1 ? '' : 's'} incluido{metrics.totalOrders === 1 ? '' : 's'}
          </p>
        </section>
      ) : null}

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Resumen principal</h2>
          <p className="mt-1 text-sm text-muted-foreground">Resultado financiero del período seleccionado.</p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total vendido" value={formatMoney(metrics.sold)} tone="slate" />
            <MetricCard label="Costo Eugenio" value={formatMoney(metrics.productionCosts)} tone="amber" />
            <MetricCard label="Ganancia neta" value={formatMoney(metrics.netProfit)} tone={netProfitTone} />
            <MetricCard label="Pendiente" value={formatMoney(metrics.pending)} tone="red" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Fondo de gastos de producción" value={formatMoney(metrics.productionExpenses)} tone="amber" />
            <MetricCard label="Gastos reales" value={formatMoney(metrics.actualExpenses)} tone="slate" helper="Gastos registrados en el período" />
            <MetricCard
              label={metrics.availableProductionExpenseFund < 0 ? 'Disponible del fondo · Sobregasto' : 'Disponible del fondo'}
              value={formatMoney(metrics.availableProductionExpenseFund)}
              tone={metrics.availableProductionExpenseFund < 0 ? 'red' : 'green'}
            />
            <MetricCard label="Diezmo" value={formatMoney(metrics.reserveAmount)} tone="purple" helper={`${reservePercentage}% de ganancia bruta positiva`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Ahorro 30%" value={formatMoney(metrics.savingsAmount)} tone="green" />
            <MetricCard label="Casa 70%" value={formatMoney(metrics.householdAmount)} tone="green" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Distribución de ganancia neta</h2>
          <p className="mt-1 text-sm text-muted-foreground">Asignación del resultado positivo entre ahorro y casa.</p>
        </div>
        <SavingsDistribution savings={metrics.savingsAmount} household={metrics.householdAmount} />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Visualizaciones operativas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Composición de los pedidos incluidos en el reporte.</p>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
          <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">{metrics.totalOrders} pedidos</span>
          <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">{metrics.deliveredOrders} entregados</span>
          <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">{metrics.pendingOrders} pendientes</span>
          <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">{metrics.cancelledOrders} cancelados</span>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-4 font-semibold">Pedidos por estado</h3>
            <ReportChart data={statusCounts} dataKey="count" nameKey="name" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-4 font-semibold">Tipo de entrega</h3>
            <ReportChart data={deliveryCounts} dataKey="count" nameKey="name" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-4 font-semibold">Deportes más solicitados</h3>
            <ReportChart data={sportCounts} dataKey="count" nameKey="name" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle financiero</p>
          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-bold text-foreground">Detalle por pedido</h2>
            <p className="text-sm text-muted-foreground">
              {metrics.financialOrders.length} pedido{metrics.financialOrders.length === 1 ? '' : 's'} no cancelado{metrics.financialOrders.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="space-y-3 xl:hidden">
          {metrics.financialOrders.map((order) => {
            const financials = calculateOrderFinancials(order, reservePercentage)
            const isExpanded = expandedOrderIds.has(order.id)
            return (
              <article key={order.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitud {order.request_number}</p>
                    <h3 className="mt-1 font-bold text-foreground">{order.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">{order.sport_name}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{statusLabels[normalizeOrderStatus(order.status)]}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">Precio venta</dt><dd className="font-semibold">{formatMoney(order.total_amount)}</dd></div>
                  <div><dt className="text-muted-foreground">Costo Eugenio</dt><dd className="font-semibold text-amber-800 dark:text-amber-300">{formatMoney(order.production_cost)}</dd></div>
                  <div><dt className="text-muted-foreground">Ganancia neta</dt><dd className={`font-bold ${financials.net_profit < 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatMoney(financials.net_profit)}</dd></div>
                  <div><dt className="text-muted-foreground">Ahorro 30%</dt><dd className="font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(financials.savings_amount)}</dd></div>
                  <div><dt className="text-muted-foreground">Casa 70%</dt><dd className="font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(financials.household_amount)}</dd></div>
                </dl>
                {isExpanded ? (
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-5">
                    <div><dt className="text-muted-foreground">Gasto producción</dt><dd className="font-semibold text-amber-800 dark:text-amber-300">{formatMoney(order.production_expense)}</dd></div>
                    <div><dt className="text-muted-foreground">Ganancia bruta</dt><dd className={`font-semibold ${financials.gross_profit < 0 ? 'text-destructive' : ''}`}>{formatMoney(financials.gross_profit)}</dd></div>
                    <div><dt className="text-muted-foreground">Diezmo</dt><dd className="font-semibold text-violet-700 dark:text-violet-300">{formatMoney(financials.reserve_amount)}</dd></div>
                    <div><dt className="text-muted-foreground">Cobrado</dt><dd className="font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(order.paid_amount)}</dd></div>
                    <div><dt className="text-muted-foreground">Pendiente</dt><dd className={`font-semibold ${order.balance_amount > 0 ? 'text-destructive' : ''}`}>{formatMoney(order.balance_amount)}</dd></div>
                  </dl>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOrderDetail(order.id)}
                  className="mt-3 w-full border-t border-border pt-3 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? <ChevronUp size={16} className="mr-2" /> : <ChevronDown size={16} className="mr-2" />}
                  {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                </Button>
              </article>
            )
          })}
          {metrics.financialOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No hay pedidos para los filtros seleccionados.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span>Vista resumida</span>
            <span>Desliza horizontalmente si necesitas ver más contenido →</span>
          </div>
          <div className="overflow-x-auto shadow-inner">
            <table className="w-full min-w-[1160px] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="sticky left-0 z-20 w-[120px] bg-muted px-4 py-3 font-semibold shadow-[6px_0_10px_-10px_rgba(0,0,0,0.55)]">N.º solicitud</th>
                  <th className="sticky left-[120px] z-20 w-[180px] bg-muted px-4 py-3 font-semibold shadow-[8px_0_12px_-12px_rgba(0,0,0,0.65)]">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Deporte</th>
                  <th className="px-4 py-3 text-right font-semibold">Precio venta</th>
                  <th className="px-4 py-3 text-right font-semibold">Costo Eugenio</th>
                  <th className="px-4 py-3 text-right font-semibold">Ganancia neta</th>
                  <th className="px-4 py-3 text-right font-semibold">Ahorro 30%</th>
                  <th className="px-4 py-3 text-right font-semibold">Casa 70%</th>
                  <th className="px-4 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.financialOrders.map((order) => {
                  const financials = calculateOrderFinancials(order, reservePercentage)
                  const isExpanded = expandedOrderIds.has(order.id)
                  return (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-muted/30">
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-3 font-bold shadow-[6px_0_10px_-10px_rgba(0,0,0,0.55)]">{order.request_number}</td>
                        <td className="sticky left-[120px] z-10 whitespace-nowrap bg-card px-4 py-3 shadow-[8px_0_12px_-12px_rgba(0,0,0,0.65)]">{order.customer_name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{order.sport_name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(order.total_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-amber-800 dark:text-amber-300">{formatMoney(order.production_cost)}</td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${financials.net_profit < 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatMoney(financials.net_profit)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(financials.savings_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(financials.household_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleOrderDetail(order.id)}>
                            {isExpanded ? <ChevronUp size={15} className="mr-1.5" /> : <ChevronDown size={15} className="mr-1.5" />}
                            {isExpanded ? 'Ocultar' : 'Ver detalle'}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-muted/20">
                          <td colSpan={9} className="px-5 py-4">
                            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
                              <div><dt className="text-muted-foreground">Gasto producción</dt><dd className="mt-1 font-semibold text-amber-800 dark:text-amber-300">{formatMoney(order.production_expense)}</dd></div>
                              <div><dt className="text-muted-foreground">Ganancia bruta</dt><dd className={`mt-1 font-semibold ${financials.gross_profit < 0 ? 'text-destructive' : ''}`}>{formatMoney(financials.gross_profit)}</dd></div>
                              <div><dt className="text-muted-foreground">Diezmo</dt><dd className="mt-1 font-semibold text-violet-700 dark:text-violet-300">{formatMoney(financials.reserve_amount)}</dd></div>
                              <div><dt className="text-muted-foreground">Cobrado</dt><dd className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(order.paid_amount)}</dd></div>
                              <div><dt className="text-muted-foreground">Pendiente</dt><dd className={`mt-1 font-semibold ${order.balance_amount > 0 ? 'text-destructive' : ''}`}>{formatMoney(order.balance_amount)}</dd></div>
                            </dl>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
                {metrics.financialOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      No hay pedidos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
