import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type OrderWithFinancials = Database['public']['Views']['order_financials']['Row']
export type BusinessMetrics = Database['public']['Views']['business_metrics']['Row']
export type FinancialSettingsRow = Database['public']['Tables']['financial_settings']['Row']

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data.user
}

export async function getCatalogs() {
  const supabase = await createClient()
  const [sports, paymentMethods, expenseCategories] = await Promise.all([
    supabase.from('sports').select('*').eq('is_active', true).order('name'),
    supabase.from('payment_methods').select('*').eq('is_active', true).order('name'),
    supabase.from('expense_categories').select('*').eq('is_active', true).order('name'),
  ])

  return {
    sports: sports.data ?? [],
    paymentMethods: paymentMethods.data ?? [],
    expenseCategories: expenseCategories.data ?? [],
    errors: [sports.error, paymentMethods.error, expenseCategories.error].filter(Boolean),
  }
}

export async function getOrders() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_financials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function getOrderById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_financials')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getOrderPayments(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('paid_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function getExpenses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function getBusinessMetrics() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('business_metrics')
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getSettingsCatalogs() {
  const supabase = await createClient()
  const [sports, paymentMethods, expenseCategories] = await Promise.all([
    supabase.from('sports').select('*').order('name'),
    supabase.from('payment_methods').select('*').order('name'),
    supabase.from('expense_categories').select('*').order('name'),
  ])

  return {
    sports: sports.data ?? [],
    paymentMethods: paymentMethods.data ?? [],
    expenseCategories: expenseCategories.data ?? [],
    errors: [sports.error, paymentMethods.error, expenseCategories.error].filter(Boolean),
  }
}

export async function getFinancialSettings(): Promise<FinancialSettingsRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('financial_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getOrderPaymentsAll() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_payments')
    .select('*')
    .order('paid_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}
