'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database, DeliveryType, OrderStatus } from '@/lib/supabase/database.types'
import type { ActionResult, OrderFormValues, PaymentFormValues, OrderPayment } from '@/lib/orders/types'
import { deliveryTypes, normalizeDeliveryType, orderStatuses } from '@/lib/orders/types'

type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']

function cleanText(value: string) {
  return value.trim()
}

function parseAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : NaN
}

function isDeliveryType(value: string): value is DeliveryType {
  return deliveryTypes.includes(value as DeliveryType)
}

function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus)
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null }
  }

  return { supabase, user }
}

function revalidateOrderSurfaces() {
  revalidatePath('/dashboard')
  revalidatePath('/orders')
  revalidatePath('/production')
  revalidatePath('/deliveries')
  revalidatePath('/finances')
  revalidatePath('/reports')
}

async function resolveOrderForm(values: OrderFormValues): Promise<ActionResult<OrderInsert>> {
  const requestNumber = cleanText(values.request_number)
  const customerName = cleanText(values.customer_name)
  const customerPhone = cleanText(values.customer_phone)
  const totalAmount = parseAmount(values.total_amount)
  const destination = cleanText(values.destination)
  const productionExpense = parseAmount(values.production_expense)
  const productionCost = values.production_cost.trim() === '' ? null : parseAmount(values.production_cost)
  const deliveryType = normalizeDeliveryType(values.delivery_type)

  if (!requestNumber) return { ok: false, error: 'Ingresa el N.º de solicitud.' }
  if (!customerName) return { ok: false, error: 'Ingresa el nombre del cliente.' }
  if (!customerPhone) return { ok: false, error: 'Ingresa el WhatsApp o teléfono del cliente.' }
  if (!cleanText(values.sport_name)) return { ok: false, error: 'Selecciona o escribe un deporte.' }
  if (!Number.isFinite(totalAmount) || totalAmount < 0) return { ok: false, error: 'Ingresa un precio de venta válido.' }
  if (!Number.isFinite(productionExpense) || productionExpense < 0) return { ok: false, error: 'Ingresa un gasto de producción válido.' }
  if (productionCost !== null && (!Number.isFinite(productionCost) || productionCost < 0)) return { ok: false, error: 'Ingresa un costo de Eugenio válido.' }
  if (!isDeliveryType(values.delivery_type)) return { ok: false, error: 'Selecciona un tipo de entrega válido.' }
  if (deliveryType === 'envio' && !destination) return { ok: false, error: 'Ingresa el destino del envío.' }

  const order: OrderInsert = {
    request_number: requestNumber,
    customer_name: customerName,
    customer_phone: customerPhone,
    sport_id: values.sport_id || null,
    sport_name: cleanText(values.sport_name),
    total_amount: totalAmount,
    production_expense: productionExpense,
    production_cost: productionCost,
    production_notes: cleanText(values.production_notes) || null,
    delivery_type: deliveryType,
    destination: deliveryType === 'envio' ? destination : 'Santa Cruz',
    notes: cleanText(values.notes) || null,
    due_date: values.due_date || null,
  }

  return { ok: true, data: order }
}

export async function createOrder(values: OrderFormValues): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const parsed = await resolveOrderForm(values)
  if (!parsed.ok) return parsed

  const initialPaymentAmount = parseAmount(values.initial_payment_amount || '0')
  const totalAmount = Number(parsed.data.total_amount)

  if (!Number.isFinite(initialPaymentAmount) || initialPaymentAmount < 0) {
    return { ok: false, error: 'Ingresa un anticipo válido.' }
  }

  if (initialPaymentAmount > totalAmount) {
    return { ok: false, error: 'El anticipo no puede ser mayor al precio total.' }
  }


  const { data, error } = await (supabase.from('orders') as any)
    .insert({ ...parsed.data, status: 'produccion', created_by: user.id })
    .select('id')
    .single()

  if (error) return { ok: false, error: 'No se pudo crear el pedido.' }

  if (initialPaymentAmount > 0) {
    const { error: paymentError } = await (supabase.from('order_payments') as any).insert({
      order_id: data.id,
      amount: initialPaymentAmount,
      payment_method_id: values.initial_payment_method_id || null,
      payment_method_name: cleanText(values.initial_payment_method_name) || 'No especificado',
      notes: cleanText(values.initial_payment_notes) || 'Anticipo inicial',
      paid_at: new Date().toISOString(),
      created_by: user.id,
    })

    if (paymentError) return { ok: false, error: 'El pedido se creó, pero no se pudo registrar el anticipo inicial.' }
  }

  revalidateOrderSurfaces()
  return { ok: true, data }
}

export async function updateOrder(id: string, values: OrderFormValues): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const parsed = await resolveOrderForm(values)
  if (!parsed.ok) return parsed

  const editableFields = 'id, request_number, customer_name, customer_phone, sport_id, sport_name, total_amount, production_expense, production_cost, production_notes, delivery_type, destination, notes, due_date, status'
  const { data: existing, error: existingError } = await (supabase.from('orders') as any)
    .select(editableFields)
    .eq('id', id)
    .single()

  if (existingError || !existing) return { ok: false, error: 'El pedido ya no existe o no se pudo validar.' }

  const update: OrderUpdate = { ...parsed.data }
  const { data, error } = await (supabase.from('orders') as any).update(update).eq('id', id).select('id').single()

  if (error) return { ok: false, error: 'No se pudo actualizar el pedido.' }

  const changedFields = Object.keys(update).filter((field) => {
    const before = existing[field] ?? null
    const after = (update as Record<string, unknown>)[field] ?? null
    return String(before) !== String(after)
  })
  console.info('order.updated', {
    orderId: id,
    changedFields,
    userId: user.id,
    occurredAt: new Date().toISOString(),
  })

  revalidateOrderSurfaces()
  return { ok: true, data }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<ActionResult<{ id: string; status: OrderStatus }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }
  if (!isOrderStatus(status)) return { ok: false, error: 'Estado inválido.' }

  const update: OrderUpdate = {
    status,
    delivered_at: status === 'entregado' ? new Date().toISOString() : null,
  }

  const { data, error } = await (supabase.from('orders') as any).update(update).eq('id', id).select('id, status').single()

  if (error) return { ok: false, error: 'No se pudo cambiar el estado.' }

  revalidateOrderSurfaces()
  return { ok: true, data }
}

export async function listOrderPayments(orderId: string): Promise<ActionResult<OrderPayment[]>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const { data, error } = await supabase
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('paid_at', { ascending: false })

  if (error) return { ok: false, error: 'No se pudieron cargar los pagos.' }

  return { ok: true, data }
}

export async function registerOrderPayment(orderId: string, values: PaymentFormValues): Promise<ActionResult<OrderPayment>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const amount = parseAmount(values.amount)
  const paymentMethodName = cleanText(values.payment_method_name)

  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Ingresa un monto de pago válido.' }
  if (!paymentMethodName) return { ok: false, error: 'Selecciona un método de pago.' }

  const { data: order, error: orderError } = await (supabase.from('order_financials') as any)
    .select('balance_amount')
    .eq('id', orderId)
    .single()

  if (orderError || !order) return { ok: false, error: 'No se pudo validar el saldo del pedido.' }

  const balance = Number(order.balance_amount)
  if (amount > balance) return { ok: false, error: 'El pago supera el saldo pendiente del pedido.' }

  const { data, error } = await (supabase.from('order_payments') as any)
    .insert({
      order_id: orderId,
      amount,
      payment_method_id: values.payment_method_id || null,
      payment_method_name: paymentMethodName,
      paid_at: values.paid_at ? new Date(values.paid_at).toISOString() : new Date().toISOString(),
      notes: cleanText(values.notes) || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return { ok: false, error: 'No se pudo registrar el pago.' }

  revalidateOrderSurfaces()
  return { ok: true, data }
}
