'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { registerOrderPayment } from '@/app/orders/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { PaymentFormValues, PaymentMethodOption } from '@/lib/orders/types'
import { findDefaultPaymentMethod, formatMoney, todayDateInputValue } from '@/lib/orders/types'

type DeliveryPaymentModalProps = {
  order: OrderWithFinancials
  paymentMethods: PaymentMethodOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function emptyPaymentForm(order: OrderWithFinancials, paymentMethods: PaymentMethodOption[]): PaymentFormValues {
  const defaultMethod = findDefaultPaymentMethod(paymentMethods)
  return {
    amount: order.balance_amount > 0 ? String(order.balance_amount) : '',
    payment_method_id: defaultMethod?.id ?? '',
    payment_method_name: defaultMethod?.name ?? '',
    paid_at: todayDateInputValue(),
    notes: '',
  }
}

export function DeliveryPaymentModal({ order, paymentMethods, open, onOpenChange }: DeliveryPaymentModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<PaymentFormValues>(() => emptyPaymentForm(order, paymentMethods))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFormData(emptyPaymentForm(order, paymentMethods))
    setError('')
  }, [open, order, paymentMethods])

  if (!open) return null

  const amount = Number(formData.amount) || 0
  const paymentExceedsBalance = amount > Number(order.balance_amount)
  const remainingBalance = Math.max(Number(order.balance_amount) - amount, 0)

  const handlePaymentMethodChange = (paymentMethodId: string) => {
    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId)
    setFormData({
      ...formData,
      payment_method_id: paymentMethodId,
      payment_method_name: selectedMethod?.name ?? '',
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await registerOrderPayment(order.id, formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
      onOpenChange(false)
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-card rounded-t-lg md:rounded-lg border border-border w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border p-4 md:p-6 flex items-center justify-between sticky top-0 bg-card">
          <h2 className="text-xl md:text-2xl font-bold">Registrar pago</h2>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition" type="button">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-foreground">{order.customer_name}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold">{formatMoney(order.total_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo actual</p>
                <p className="font-semibold text-red-600 dark:text-red-400">{formatMoney(order.balance_amount)}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Monto a pagar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
                step="0.01"
                min="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Saldo actual: {formatMoney(order.balance_amount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Método de pago</label>
            <select
              value={formData.payment_method_id}
              onChange={(event) => handlePaymentMethodChange(event.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Método de pago</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Fecha de pago</label>
            <input
              type="date"
              value={formData.paid_at}
              onChange={(event) => setFormData({ ...formData, paid_at: event.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Agregar notas sobre el pago..."
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pago</p>
                <p className="font-bold text-green-600 dark:text-green-400">+{formatMoney(amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nuevo saldo</p>
                <p className={`font-bold ${remainingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatMoney(remainingBalance)}
                </p>
              </div>
            </div>
          </div>

          {paymentExceedsBalance ? (
            <p className="text-sm text-destructive">El pago supera el saldo pendiente del pedido.</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending || paymentMethods.length === 0 || paymentExceedsBalance}>{isPending ? 'Registrando...' : 'Registrar pago'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
