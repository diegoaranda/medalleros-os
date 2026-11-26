'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/orders/types'
import type { OrderAdminAction, OrderAdminSnapshot } from './types'

type RpcError = { code?: string }
function adminError(error: RpcError) {
  if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42P01') {
    return 'Las acciones administrativas requieren la migración pendiente. Contacta al administrador.'
  }
  if (error.code === '42501') return 'No tienes permisos para realizar esta acción.'
  if (error.code === 'P0002') return 'El pedido ya no existe o no tienes acceso.'
  if (error.code === '40001' || error.code === '40P01') return 'El pedido o sus pagos cambiaron. Vuelve a cargar la confirmación.'
  if (error.code === '22023') return 'La acción no está disponible o falta la confirmación adicional. Vuelve a cargar el pedido.'
  return 'No se pudo completar la acción. Vuelve a cargar el pedido antes de intentarlo de nuevo.'
}

async function requireOperator() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  // Existing RLS authorizes authenticated workshop users, without a separate admin role.
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('id', user.id).single()
  return profileError || !profile ? null : supabase
}

export async function getOrderAdminSnapshot(orderId: string): Promise<ActionResult<OrderAdminSnapshot>> {
  const supabase = await requireOperator()
  if (!supabase) return { ok: false, error: 'Tu sesión expiró o no tienes permisos. Vuelve a iniciar sesión.' }
  const { data, error } = await supabase.rpc('get_order_admin_snapshot', { p_order_id: orderId })
  if (error) return { ok: false, error: adminError(error) }
  return { ok: true, data: data as unknown as OrderAdminSnapshot }
}

export async function applyOrderAdminAction(
  orderId: string, action: OrderAdminAction, revision: string, financialConfirmation: boolean,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await requireOperator()
  if (!supabase) return { ok: false, error: 'Tu sesión expiró o no tienes permisos. Vuelve a iniciar sesión.' }
  if (!['cancel', 'delete', 'undo_delivery'].includes(action) || !revision) return { ok: false, error: 'Acción inválida.' }
  const { data, error } = await supabase.rpc('apply_order_admin_action', {
    p_order_id: orderId, p_action: action, p_expected_revision: revision,
    p_financial_confirmation: financialConfirmation === true,
  })
  if (error) return { ok: false, error: adminError(error) }
  for (const path of ['/dashboard', '/orders', '/production', '/deliveries', '/finances', '/reports']) revalidatePath(path)
  return { ok: true, data: { id: data } }
}
