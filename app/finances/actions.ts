'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ExpenseInput = {
  category_id: string
  category_name: string
  amount: string
  expense_date: string
  description: string
}

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function cleanText(value: string) {
  return value.trim()
}

function parseAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : NaN
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

function revalidateFinanceSurfaces() {
  revalidatePath('/finances')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

export async function createExpense(values: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const amount = parseAmount(values.amount)
  const categoryName = cleanText(values.category_name)
  const description = cleanText(values.description)

  if (!categoryName) return { ok: false, error: 'Selecciona una categoría.' }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Ingresa un monto válido.' }
  if (!description) return { ok: false, error: 'Ingresa una descripción.' }

  const { data, error } = await (supabase.from('expenses') as any)
    .insert({
      category_id: values.category_id || null,
      category_name: categoryName,
      amount,
      description,
      expense_date: values.expense_date || new Date().toISOString().split('T')[0],
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: 'No se pudo registrar el gasto.' }

  revalidateFinanceSurfaces()
  return { ok: true, data }
}

export async function deleteExpense(id: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) return { ok: false, error: 'No se pudo eliminar el gasto.' }

  revalidateFinanceSurfaces()
  return { ok: true, data: { id } }
}
