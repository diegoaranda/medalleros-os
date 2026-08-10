'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseMoneyInput } from '@/lib/money'

type CatalogKind = 'sports' | 'medalleros' | 'payments' | 'expenses'
type CatalogInput = {
  name: string
  description?: string
  suggested_price?: string
}

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const tableByKind = {
  sports: 'sports',
  medalleros: 'medallero_catalog',
  payments: 'payment_methods',
  expenses: 'expense_categories',
} as const

function cleanText(value: string | undefined) {
  return (value ?? '').trim()
}

function parseSuggestedPrice(value: string | undefined) {
  if (!value) return 0
  return parseMoneyInput(value)
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

function buildPayload(kind: CatalogKind, input: CatalogInput) {
  const name = cleanText(input.name)

  if (!name) {
    return { ok: false, error: 'Ingresa un nombre.' } as const
  }

  if (kind !== 'medalleros') {
    return { ok: true, data: { name } } as const
  }

  const suggestedPrice = parseSuggestedPrice(input.suggested_price)

  if (!Number.isFinite(suggestedPrice) || suggestedPrice < 0) {
    return { ok: false, error: 'Ingresa un precio sugerido válido.' } as const
  }

  return {
    ok: true,
    data: {
      name,
      description: cleanText(input.description) || null,
      suggested_price: suggestedPrice,
    },
  } as const
}

export async function createCatalogItem(kind: CatalogKind, input: CatalogInput): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const payload = buildPayload(kind, input)
  if (!payload.ok) return payload

  const table = tableByKind[kind]
  const { data, error } = await (supabase.from(table) as any).insert(payload.data).select('id').single()

  if (error) return { ok: false, error: 'No se pudo crear el elemento.' }

  revalidatePath('/settings')
  revalidatePath('/orders')
  return { ok: true, data }
}

export async function updateCatalogItem(kind: CatalogKind, id: string, input: CatalogInput): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const payload = buildPayload(kind, input)
  if (!payload.ok) return payload

  const table = tableByKind[kind]
  const { data, error } = await (supabase.from(table) as any).update(payload.data).eq('id', id).select('id').single()

  if (error) return { ok: false, error: 'No se pudo actualizar el elemento.' }

  revalidatePath('/settings')
  revalidatePath('/orders')
  return { ok: true, data }
}

export async function setCatalogItemActive(kind: CatalogKind, id: string, isActive: boolean): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const table = tableByKind[kind]
  const { data, error } = await (supabase.from(table) as any).update({ is_active: isActive }).eq('id', id).select('id').single()

  if (error) return { ok: false, error: 'No se pudo cambiar el estado del elemento.' }

  revalidatePath('/settings')
  revalidatePath('/orders')
  return { ok: true, data }
}

export async function updateFinancialSettings(values: {
  production_expense_default: string
  reserve_percentage: string
}): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const productionExpenseDefault = parseMoneyInput(values.production_expense_default)
  const reservePercentage = Number(values.reserve_percentage)

  if (!Number.isFinite(productionExpenseDefault) || productionExpenseDefault < 0) {
    return { ok: false, error: 'Ingresa un gasto base válido.' }
  }

  if (!Number.isFinite(reservePercentage) || reservePercentage < 0 || reservePercentage > 100) {
    return { ok: false, error: 'El porcentaje de reserva debe estar entre 0 y 100.' }
  }

  const { data, error } = await (supabase.from('financial_settings') as any)
    .upsert({
      id: 'default',
      production_expense_default: productionExpenseDefault,
      reserve_percentage: reservePercentage,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: 'No se pudo actualizar la configuración financiera.' }

  revalidatePath('/settings')
  revalidatePath('/orders')
  revalidatePath('/production')
  revalidatePath('/finances')
  revalidatePath('/reports')
  revalidatePath('/dashboard')
  return { ok: true, data }
}
