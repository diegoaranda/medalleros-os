import type { OrderWithFinancials } from '@/lib/data/queries'
import type { OrderPayment } from '@/lib/orders/types'

export type OrderAdminAction = 'cancel' | 'delete' | 'undo_delivery'
export type OrderAdminSnapshot = {
  order: OrderWithFinancials
  payments: OrderPayment[]
  revision: string
}

export function needsFinancialConfirmation(snapshot: OrderAdminSnapshot) {
  return snapshot.payments.length > 0 || snapshot.order.production_cost !== null || Number(snapshot.order.production_expense) > 0
}
