import type { Database, DeliveryType, OrderStatus } from '@/lib/supabase/database.types'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { formatMoneyAmount } from '@/lib/money'

export type CatalogOption = {
  id: string
  name: string
}

export type MedalleroOption = CatalogOption & {
  suggested_price: number
}

export type PaymentMethodOption = CatalogOption

export type OrderPayment = Database['public']['Tables']['order_payments']['Row']

export type OrderFormValues = {
  request_number: string
  customer_name: string
  customer_phone: string
  sport_id: string
  sport_name: string
  total_amount: string
  production_expense: string
  production_cost: string
  production_notes: string
  delivery_type: DeliveryType
  destination: string
  notes: string
  due_date: string
  initial_payment_amount: string
  initial_payment_method_id: string
  initial_payment_method_name: string
  initial_payment_notes: string
}

export type PaymentFormValues = {
  amount: string
  payment_method_id: string
  payment_method_name: string
  paid_at: string
  notes: string
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const orderStatuses: OrderStatus[] = ['nuevo', 'diseno', 'produccion', 'listo', 'entregado', 'cancelado']
export const operationalOrderStatuses: OrderStatus[] = ['produccion', 'listo', 'entregado', 'cancelado']

export const statusLabels: Record<OrderStatus, string> = {
  nuevo: 'Producción',
  diseno: 'Producción',
  produccion: 'Producción',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const deliveryTypeLabels: Record<DeliveryType, string> = {
  envio: 'Envío',
  recogida: 'Local',
  local: 'Local',
}

export const deliveryTypes: DeliveryType[] = ['envio', 'recogida', 'local']
export const operationalDeliveryTypes: DeliveryType[] = ['local', 'envio']

export const statusColors: Record<OrderStatus, string> = {
  nuevo: 'bg-amber-100 text-amber-800',
  diseno: 'bg-amber-100 text-amber-800',
  produccion: 'bg-amber-100 text-amber-800',
  listo: 'bg-emerald-100 text-emerald-800',
  entregado: 'bg-slate-200 text-slate-700',
  cancelado: 'bg-red-100 text-red-700',
}

export function emptyOrderFormValues(): OrderFormValues {
  return {
    request_number: '',
    customer_name: '',
    customer_phone: '',
    sport_id: '',
    sport_name: '',
    total_amount: '',
    production_expense: '30',
    production_cost: '',
    production_notes: '',
    delivery_type: 'local',
    destination: 'Santa Cruz',
    notes: '',
    due_date: '',
    initial_payment_amount: '',
    initial_payment_method_id: '',
    initial_payment_method_name: '',
    initial_payment_notes: '',
  }
}

export function orderToFormValues(order: OrderWithFinancials): OrderFormValues {
  const deliveryType = normalizeDeliveryType(order.delivery_type)

  return {
    request_number: order.request_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    sport_id: order.sport_id ?? '',
    sport_name: order.sport_name,
    total_amount: String(order.total_amount),
    production_expense: String(order.production_expense),
    production_cost: order.production_cost == null ? '' : String(order.production_cost),
    production_notes: order.production_notes ?? '',
    delivery_type: deliveryType,
    destination: deliveryType === 'local' ? 'Santa Cruz' : order.destination ?? '',
    notes: order.notes ?? '',
    due_date: order.due_date ?? '',
    initial_payment_amount: '',
    initial_payment_method_id: '',
    initial_payment_method_name: '',
    initial_payment_notes: '',
  }
}

export function normalizeOrderStatus(status: OrderStatus): OrderStatus {
  return status === 'nuevo' || status === 'diseno' ? 'produccion' : status
}

export function normalizeDeliveryType(deliveryType: DeliveryType): DeliveryType {
  return deliveryType === 'recogida' ? 'local' : deliveryType
}

export function findDefaultPaymentMethod(paymentMethods: PaymentMethodOption[]) {
  const qrMethod = paymentMethods.find((method) => (
    method.name
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') === 'QR'
  ))

  return qrMethod ?? paymentMethods[0]
}

export function formatMoney(value: number | null | undefined) {
  return formatMoneyAmount(value)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-MX')
}

export function todayDateInputValue() {
  return new Date().toISOString().split('T')[0]
}
