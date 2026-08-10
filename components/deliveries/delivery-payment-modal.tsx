'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { registerOrderPayment, updateOrderStatus } from '@/app/orders/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { PaymentFormValues, PaymentMethodOption } from '@/lib/orders/types'
import { findDefaultPaymentMethod, formatMoney, normalizeDeliveryType, todayDateInputValue } from '@/lib/orders/types'
import { parseMoneyInput } from '@/lib/money'

type DeliveryPaymentModalProps = {
  order: OrderWithFinancials
  paymentMethods: PaymentMethodOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelivered: () => void
}

function emptyPaymentForm(order: OrderWithFinancials, paymentMethods: PaymentMethodOption[]): PaymentFormValues {
  const defaultMethod = findDefaultPaymentMethod(paymentMethods)
  return {
    amount: String(Math.max(Number(order.balance_amount), 0)),
    payment_method_id: defaultMethod?.id ?? '',
    payment_method_name: defaultMethod?.name ?? '',
    paid_at: todayDateInputValue(),
    notes: '',
  }
}

export function DeliveryPaymentModal({ order, paymentMethods, open, onOpenChange, onDelivered }: DeliveryPaymentModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<PaymentFormValues>(() => emptyPaymentForm(order, paymentMethods))
  const [error, setError] = useState('')
  const [confirmPendingBalance, setConfirmPendingBalance] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormData(emptyPaymentForm(order, paymentMethods))
    setError('')
    setConfirmPendingBalance(false)
  }, [open, order, paymentMethods])

  if (!open) return null

  const rawAmount = formData.amount.trim()
  const amount = parseMoneyInput(rawAmount)
  const currentBalance = Number(order.balance_amount)
  const amountIsValid = rawAmount !== '' && Number.isFinite(amount) && amount >= 0 && amount <= currentBalance
  const remainingBalance = amountIsValid ? Math.max(currentBalance - amount, 0) : currentBalance
  const paymentMethodMissing = amount > 0 && !formData.payment_method_name.trim()

  const handlePaymentMethodChange = (paymentMethodId: string) => {
    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId)
    setFormData({ ...formData, payment_method_id: paymentMethodId, payment_method_name: selectedMethod?.name ?? '' })
  }

  const completeDelivery = () => {
    setError('')
    startTransition(async () => {
      if (amount > 0) {
        const paymentResult = await registerOrderPayment(order.id, formData)
        if (!paymentResult.ok) {
          setError(paymentResult.error)
          return
        }
      }

      const statusResult = await updateOrderStatus(order.id, 'entregado')
      if (!statusResult.ok) {
        setError(statusResult.error)
        return
      }

      onOpenChange(false)
      onDelivered()
      router.refresh()
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!amountIsValid) {
      setError('Ingresa un monto válido entre Bs 0 y el saldo pendiente.')
      return
    }
    if (paymentMethodMissing) {
      setError('Selecciona un método de pago.')
      return
    }
    if (remainingBalance > 0) {
      setConfirmPendingBalance(true)
      return
    }
    completeDelivery()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="deliver-order-title" className="max-h-[100dvh] w-full overflow-y-auto bg-card sm:max-w-lg sm:rounded-xl sm:border sm:border-border">
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
            <h2 id="deliver-order-title" className="text-xl font-bold tracking-[-0.025em]">Entregar pedido</h2>
            <button onClick={() => onOpenChange(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar formulario" disabled={isPending}><X size={22} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="col-span-2"><p className="text-muted-foreground">Cliente</p><p className="font-semibold">{order.customer_name}</p></div>
              <div><p className="text-muted-foreground">Solicitud</p><p className="font-semibold">{order.request_number}</p></div>
              <div><p className="text-muted-foreground">Modalidad</p><p className="font-semibold">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Local' : 'Envío'}</p></div>
              <div><p className="text-muted-foreground">Total</p><p className="numeric font-semibold">{formatMoney(order.total_amount)}</p></div>
              <div><p className="text-muted-foreground">Pagado</p><p className="numeric font-semibold text-emerald-700">{formatMoney(order.paid_amount)}</p></div>
              <div><p className="text-muted-foreground">Saldo pendiente</p><p className="numeric font-bold text-red-700">{formatMoney(currentBalance)}</p></div>
              <div><p className="text-muted-foreground">Costo de Eugenio</p><p className="numeric font-semibold">{formatMoney(order.production_cost)}</p></div>
            </div>

            <div>
              <label htmlFor="delivery-payment-amount" className="field-label">Monto recibido hoy</label>
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Bs</span><input id="delivery-payment-amount" type="text" inputMode="decimal" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} className="field-control numeric pl-11" required /></div>
            </div>

            <div>
              <label htmlFor="delivery-payment-method" className="field-label">Método de pago</label>
              <select id="delivery-payment-method" value={formData.payment_method_id} onChange={(event) => handlePaymentMethodChange(event.target.value)} className="field-control" disabled={amount === 0} required={amount > 0}><option value="">Método de pago</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select>
            </div>

            <div><label htmlFor="delivery-payment-notes" className="field-label">Notas <span className="font-normal text-muted-foreground">(opcional)</span></label><textarea id="delivery-payment-notes" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} className="field-control min-h-20 resize-y py-3" rows={2} /></div>

            <div className="flex justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm"><span className="text-muted-foreground">Saldo después de hoy</span><span className={`numeric font-bold ${remainingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(remainingBalance)}</span></div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-3 pt-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>Cancelar</Button><Button type="submit" className="flex-1" disabled={isPending}>{isPending ? 'Entregando…' : 'Confirmar entrega'}</Button></div>
          </form>
        </div>
      </div>

      {confirmPendingBalance ? <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="pending-balance-title" className="w-full bg-card p-5 sm:max-w-md sm:rounded-xl sm:border"><h2 id="pending-balance-title" className="text-xl font-bold">{amount === 0 ? 'Entregar sin registrar pago' : 'Queda saldo pendiente'}</h2><p className="mt-3 text-sm text-muted-foreground">{amount === 0 ? '¿Deseas marcar el pedido como entregado sin registrar un pago?' : `El cliente todavía debe ${formatMoney(remainingBalance)}. ¿Deseas marcar igualmente el pedido como entregado?`}</p>{error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}<div className="mt-5 flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setConfirmPendingBalance(false)} disabled={isPending}>Cancelar</Button><Button className="flex-1" onClick={completeDelivery} disabled={isPending}>{isPending ? 'Entregando…' : 'Entregar igualmente'}</Button></div></div></div> : null}
    </>
  )
}
