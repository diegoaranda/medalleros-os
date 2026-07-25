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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="delivery-payment-title" className="max-h-[100dvh] w-full overflow-y-auto bg-card sm:max-w-lg sm:rounded-xl sm:border sm:border-border">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:py-4">
          <h2 id="delivery-payment-title" className="text-xl font-bold tracking-[-0.025em]">Registrar pago</h2>
          <button onClick={() => onOpenChange(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar formulario">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
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
            <label htmlFor="delivery-payment-amount" className="field-label">Monto a pagar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input
                id="delivery-payment-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.amount}
                onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                className="field-control numeric pl-11"
                required
                step="0.01"
                min="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Saldo actual: {formatMoney(order.balance_amount)}</p>
          </div>

          <div>
            <label htmlFor="delivery-payment-method" className="field-label">Método de pago</label>
            <select
              id="delivery-payment-method"
              value={formData.payment_method_id}
              onChange={(event) => handlePaymentMethodChange(event.target.value)}
              className="field-control"
              required
            >
              <option value="">Método de pago</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="delivery-payment-date" className="field-label">Fecha de pago</label>
            <input
              id="delivery-payment-date"
              type="date"
              value={formData.paid_at}
              onChange={(event) => setFormData({ ...formData, paid_at: event.target.value })}
              className="field-control"
              required
            />
          </div>

          <div>
            <label htmlFor="delivery-payment-notes" className="field-label">Notas <span className="font-normal text-muted-foreground">(opcional)</span></label>
            <textarea
              id="delivery-payment-notes"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Agregar notas sobre el pago..."
              className="field-control min-h-24 resize-y py-3"
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pago</p>
                <p className="numeric font-bold text-emerald-700">+{formatMoney(amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nuevo saldo</p>
                <p className={`numeric font-bold ${remainingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {formatMoney(remainingBalance)}
                </p>
              </div>
            </div>
          </div>

          {paymentExceedsBalance ? (
            <p className="text-sm text-destructive">El pago supera el saldo pendiente del pedido.</p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending || paymentMethods.length === 0 || paymentExceedsBalance}>{isPending ? 'Registrando...' : 'Registrar pago'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
