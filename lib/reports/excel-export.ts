import type { Row } from 'write-excel-file/browser'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { calculateOrderFinancials } from '@/lib/finance/calculations'
import type { DateRange } from '@/lib/finance/metrics'
import {
  deliveryTypeLabels,
  normalizeDeliveryType,
  normalizeOrderStatus,
  statusLabels,
} from '@/lib/orders/types'

type ReportSummary = {
  sold: number
  collected: number
  pending: number
  productionCosts: number
  productionExpenses: number
  actualExpenses: number
  availableProductionExpenseFund: number
  grossProfit: number
  reserveAmount: number
  netProfit: number
  savingsAmount: number
  householdAmount: number
}

export type ReportExportFilters = {
  period: string
  requestNumber: string
  status: string
  sport: string
  deliveryType: string
}

type ExportReportToExcelInput = {
  orders: OrderWithFinancials[]
  summary: ReportSummary
  filters: ReportExportFilters
  range: DateRange
  reservePercentage: number
  selectedRequest: string | null
  generatedAt?: Date
}

const headerStyle = {
  fontWeight: 'bold' as const,
  textColor: '#FFFFFF',
  backgroundColor: '#171717',
  alignVertical: 'center' as const,
  wrap: true,
}

const labelStyle = {
  fontWeight: 'bold' as const,
  backgroundColor: '#F3F4F6',
  textColor: '#262626',
}

const moneyFormat = '#,##0.00'
const dateFormat = 'yyyy-mm-dd'
const dateTimeFormat = 'yyyy-mm-dd hh:mm'

function moneyCell(value: number) {
  return {
    value: Number(value) || 0,
    type: Number,
    format: moneyFormat,
    align: 'right' as const,
  }
}

function excelWallClockDate(date: Date, includeTime = false) {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    includeTime ? date.getHours() : 0,
    includeTime ? date.getMinutes() : 0,
    includeTime ? date.getSeconds() : 0,
  ))
}

function dateCell(value: string | null, includeTime = false) {
  if (!value) return ''
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(dateOnly ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return {
    value: excelWallClockDate(date, includeTime),
    type: Date,
    format: includeTime ? dateTimeFormat : dateFormat,
  }
}

function localDateFilePart(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function safeFilePart(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'solicitud'
}

export function buildReportExcelData({
  orders,
  summary,
  filters,
  range,
  reservePercentage,
  selectedRequest,
  generatedAt = new Date(),
}: ExportReportToExcelInput) {
  const summaryRows: Row[] = [
    [
      { value: 'Campo', type: String, ...headerStyle },
      { value: 'Valor', type: String, ...headerStyle },
    ],
    [{ value: 'Fecha de generación', type: String, ...labelStyle }, { value: excelWallClockDate(generatedAt, true), type: Date, format: dateTimeFormat }],
    [{ value: 'Período aplicado', type: String, ...labelStyle }, filters.period],
    [{ value: 'Rango desde', type: String, ...labelStyle }, { value: excelWallClockDate(range.from), type: Date, format: dateFormat }],
    [{ value: 'Rango hasta', type: String, ...labelStyle }, { value: excelWallClockDate(range.to), type: Date, format: dateFormat }],
    [{ value: 'N.º de solicitud aplicado', type: String, ...labelStyle }, filters.requestNumber],
    [{ value: 'Estado aplicado', type: String, ...labelStyle }, filters.status],
    [{ value: 'Deporte aplicado', type: String, ...labelStyle }, filters.sport],
    [{ value: 'Tipo de entrega aplicado', type: String, ...labelStyle }, filters.deliveryType],
    [{ value: 'Cantidad de medalleros', type: String, ...labelStyle }, { value: orders.length, type: Number, format: '#,##0' }],
    [{ value: 'Total vendido', type: String, ...labelStyle }, moneyCell(summary.sold)],
    [{ value: 'Total cobrado', type: String, ...labelStyle }, moneyCell(summary.collected)],
    [{ value: 'Saldo pendiente', type: String, ...labelStyle }, moneyCell(summary.pending)],
    [{ value: 'Total costo Eugenio', type: String, ...labelStyle }, moneyCell(summary.productionCosts)],
    [{ value: 'Fondo de gastos de producción', type: String, ...labelStyle }, moneyCell(summary.productionExpenses)],
    [{ value: 'Gastos reales', type: String, ...labelStyle }, moneyCell(summary.actualExpenses)],
    [{ value: 'Disponible del fondo', type: String, ...labelStyle }, moneyCell(summary.availableProductionExpenseFund)],
    [{ value: 'Ganancia bruta', type: String, ...labelStyle }, moneyCell(summary.grossProfit)],
    [{ value: 'Diezmo', type: String, ...labelStyle }, moneyCell(summary.reserveAmount)],
    [{ value: 'Ganancia neta', type: String, ...labelStyle }, moneyCell(summary.netProfit)],
    [{ value: 'Ahorro 30%', type: String, ...labelStyle }, moneyCell(summary.savingsAmount)],
    [{ value: 'Casa 70%', type: String, ...labelStyle }, moneyCell(summary.householdAmount)],
  ]

  const detailHeaders = [
    'N.º de solicitud',
    'Cliente',
    'WhatsApp',
    'Deporte',
    'Fecha del pedido',
    'Fecha prometida',
    'Estado',
    'Tipo de entrega',
    'Destino',
    'Precio de venta',
    'Costo Eugenio',
    'Gasto de producción',
    'Ganancia bruta',
    'Diezmo',
    'Ganancia neta',
    'Ahorro 30%',
    'Casa 70%',
    'Total cobrado',
    'Saldo pendiente',
  ]

  const detailRows: Row[] = [
    detailHeaders.map((value) => ({ value, type: String, ...headerStyle })),
    ...orders.map((order) => {
      const financials = calculateOrderFinancials(order, reservePercentage)
      return [
        order.request_number,
        order.customer_name,
        order.customer_phone,
        order.sport_name,
        dateCell(order.created_at, true),
        dateCell(order.due_date),
        statusLabels[normalizeOrderStatus(order.status)],
        deliveryTypeLabels[normalizeDeliveryType(order.delivery_type)],
        order.destination ?? '',
        moneyCell(order.total_amount),
        moneyCell(order.production_cost ?? 0),
        moneyCell(order.production_expense),
        moneyCell(financials.gross_profit),
        moneyCell(financials.reserve_amount),
        moneyCell(financials.net_profit),
        moneyCell(financials.savings_amount),
        moneyCell(financials.household_amount),
        moneyCell(order.paid_amount),
        moneyCell(order.balance_amount),
      ]
    }),
  ]

  const fileName = selectedRequest
    ? `reporte-solicitud-${safeFilePart(selectedRequest)}.xlsx`
    : `reporte-medalleros-${localDateFilePart(generatedAt)}.xlsx`

  return {
    fileName,
    sheets: [
      {
        data: summaryRows,
        sheet: 'Resumen',
        columns: [{ width: 34 }, { width: 28 }],
        stickyRowsCount: 1,
        showGridLines: false,
      },
      {
        data: detailRows,
        sheet: 'Detalle por pedido',
        columns: [
          { width: 18 },
          { width: 24 },
          { width: 16 },
          { width: 18 },
          { width: 20 },
          { width: 18 },
          { width: 16 },
          { width: 18 },
          { width: 24 },
          ...Array.from({ length: 10 }, () => ({ width: 18 })),
        ],
        stickyRowsCount: 1,
        stickyColumnsCount: 2,
        orientation: 'landscape' as const,
        showGridLines: false,
      },
    ],
  }
}

export async function exportReportToExcel(input: ExportReportToExcelInput) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const { fileName, sheets } = buildReportExcelData(input)
  await writeExcelFile(sheets).toFile(fileName)
  return fileName
}
