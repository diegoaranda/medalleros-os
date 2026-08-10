'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/supabase/database.types'
import { hasValidEugenioCost } from '@/lib/orders/production'

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function cleanText(value: string) {
  return value.trim()
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { supabase, user: null }
  return { supabase, user }
}

function revalidateProductionSurfaces() {
  revalidatePath('/dashboard')
  revalidatePath('/production')
  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/finances')
  revalidatePath('/reports')
}

export async function updateProductionInfo(orderId: string, values: {
  production_expense: string
  production_notes: string
}): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const productionExpense = Number(cleanText(values.production_expense))
  if (!Number.isFinite(productionExpense) || productionExpense < 0) {
    return { ok: false, error: 'Ingresa un gasto de producción válido.' }
  }

  const { data, error } = await (supabase.from('orders') as any)
    .update({
      production_expense: productionExpense,
      production_notes: cleanText(values.production_notes) || null,
    })
    .eq('id', orderId)
    .select('id')
    .single()

  if (error) return { ok: false, error: 'No se pudo guardar la información de producción.' }

  revalidateProductionSurfaces()
  return { ok: true, data }
}

export async function updateEugenioCost(orderId: string, value: string): Promise<ActionResult<{ id: string; production_cost: number }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const cleaned = cleanText(value)
  const productionCost = cleaned ? Number(cleaned) : NaN
  if (!hasValidEugenioCost(productionCost)) {
    return { ok: false, error: 'El costo de Eugenio debe ser mayor que 0.' }
  }

  const { data: existingOrder, error: existingOrderError } = await (supabase.from('orders') as any)
    .select('id')
    .eq('id', orderId)
    .single()
  if (existingOrderError || !existingOrder) {
    return { ok: false, error: 'No se pudo actualizar el costo de Eugenio.' }
  }

  const { data, error } = await (supabase.from('orders') as any)
    .update({ production_cost: productionCost })
    .eq('id', orderId)
    .select('id, production_cost')
    .single()
  if (error) return { ok: false, error: 'No se pudo actualizar el costo de Eugenio.' }

  revalidateProductionSurfaces()
  return { ok: true, data }
}

export async function setProductionOrderStatus(orderId: string, status: Extract<OrderStatus, 'produccion' | 'listo'>): Promise<ActionResult<{ id: string; status: OrderStatus }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const { data, error } = await (supabase.from('orders') as any)
    .update({ status })
    .eq('id', orderId)
    .select('id, status')
    .single()

  if (error) return { ok: false, error: 'No se pudo cambiar el estado del pedido.' }

  revalidateProductionSurfaces()
  return { ok: true, data }
}
