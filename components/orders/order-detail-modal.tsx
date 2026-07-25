'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listOrderPayments, registerOrderPayment, updateOrderStatus } from '@/app/orders/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, OrderPayment, PaymentFormValues, PaymentMethodOption } from '@/lib/orders/types'
import {
  deliveryTypeLabels,
  findDefaultPaymentMethod,
  formatDate,
  formatMoney,
  normalizeDeliveryType,
  normalizeOrderStatus,
  operationalOrderStatuses,
  statusColors,
  statusLabels,
  todayDateInputValue,
} from '@/lib/orders/types'
import { OrderFormModal } from './order-form-modal'

type OrderDetailModalProps = {
  order: OrderWithFinancials
  open: boolean
  onOpenChange: (open: boolean) => void
  sports: CatalogOption[]
  paymentMethods: PaymentMethodOption[]
  defaultProductionExpense: number
  initialTab?: 'info' | 'payments' | 'actions'
  requestNumberLabel?: string
}

function emptyPaymentForm(balance: number, paymentMethods: PaymentMethodOption[]): PaymentFormValues {
  const defaultMethod = findDefaultPaymentMethod(paymentMethods)

  return {
    amount: balance > 0 ? String(balance) : '',
    payment_method_id: defaultMethod?.id ?? '',
    payment_method_name: defaultMethod?.name ?? '',
    paid_at: todayDateInputValue(),
    notes: '',
  }
}

export function OrderDetailModal({
  order,
  open,
  onOpenChange,
  sports,
  paymentMethods,
  defaultProductionExpense,
  initialTab = 'info',
  requestNumberLabel = order.request_number,
}: OrderDetailModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'actions'>(initialTab)
  const [showEditModal, setShowEditModal] = useState(false)
  const [payments, setPayments] = useState<OrderPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isPaymentPending, startPaymentTransition] = useTransition()
  const [paymentForm, setPaymentForm] = useState<PaymentFormValues>(() => emptyPaymentForm(order.balance_amount, paymentMethods))

  useEffect(() => {
    if (!open) return
    setActiveTab(initialTab)
    setStatusError('')
    setPaymentError('')
    setPaymentForm(emptyPaymentForm(order.balance_amount, paymentMethods))
  }, [initialTab, open, order.balance_amount, paymentMethods])

  useEffect(() => {
    if (!open || activeTab !== 'payments') return

    let ignore = false
    setPaymentsLoading(true)
    setPaymentsError('')

    listOrderPayments(order.id).then((result) => {
      if (ignore) return

      if (!result.ok) {
        setPaymentsError(result.error)
        setPayments([])
      } else {
        setPayments(result.data)
      }

      setPaymentsLoading(false)
    })

    return () => {
      ignore = true
    }
  }, [activeTab, open, order.id])

  const paidAmount = useMemo(() => payments.reduce((sum, payment) => sum + Number(payment.amount), 0), [payments])
  const currentPaid = activeTab === 'payments' && !paymentsLoading ? paidAmount : order.paid_amount
  const currentBalance = Math.max(Number(order.total_amount) - currentPaid, 0)
  const nextPaymentAmount = Number(paymentForm.amount) || 0
  const paymentExceedsBalance = nextPaymentAmount > currentBalance
  const nextBalance = Math.max(currentBalance - nextPaymentAmount, 0)

  if (!open) return null

  const handleStatusChange = (status: OrderWithFinancials['status']) => {
    setStatusError('')

    startStatusTransition(async () => {
      const result = await updateOrderStatus(order.id, status)

      if (!result.ok) {
        setStatusError(result.error)
        return
      }

      router.refresh()
    })
  }

  const handlePaymentMethodChange = (paymentMethodId: string) => {
    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId)
    setPaymentForm({
      ...paymentForm,
      payment_method_id: paymentMethodId,
      payment_method_name: selectedMethod?.name ?? '',
    })
  }

  const handlePaymentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPaymentError('')

    startPaymentTransition(async () => {
      const result = await registerOrderPayment(order.id, paymentForm)

      if (!result.ok) {
        setPaymentError(result.error)
        return
      }

      setPayments((current) => [result.data, ...current])
      setPaymentForm(emptyPaymentForm(nextBalance, paymentMethods))
      router.refresh()
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="flex h-[100dvh] w-full flex-col overflow-hidden bg-card sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-border">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:py-4">
            <div className="min-w-0">
              <p className="eyebrow mb-1">Solicitud {requestNumberLabel}</p>
              <h2 id="order-detail-title" className="truncate text-xl font-bold tracking-[-0.025em]">{order.customer_name}</h2>
              <a className="mt-1 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline" href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}>{order.customer_phone}</a>
            </div>
            <button onClick={() => onOpenChange(false)} className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar detalle">
              <X size={22} />
            </button>
          </div>

          <div className="flex shrink-0 border-b border-border" role="tablist" aria-label="Secciones del pedido">
            {(['info', 'payments', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                type="button"
              >
                {tab === 'info' && 'Información'}
                {tab === 'payments' && 'Pagos'}
                {tab === 'actions' && 'Acciones'}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Estado</p>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold w-fit ${statusColors[normalizeOrderStatus(order.status)]}`}>
                      {statusLabels[normalizeOrderStatus(order.status)]}
                    </span>
                    <select
                      value={normalizeOrderStatus(order.status)}
                      onChange={(event) => handleStatusChange(event.target.value as OrderWithFinancials['status'])}
                      className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isStatusPending}
                    >
                      {operationalOrderStatuses.map((status) => (
                        <option key={status} value={status}>{statusLabels[status]}</option>
                      ))}
                    </select>
                  </div>
                  {statusError ? <p className="text-sm text-destructive mt-2">{statusError}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">N.º de solicitud</p>
                    <p className="font-semibold">{requestNumberLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Deporte</p>
                    <p className="font-semibold">{order.sport_name}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="p-3 text-sm text-muted-foreground">Total</span>
                    <span className="numeric p-3 font-semibold">{formatMoney(order.total_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border">
                    <span className="p-3 text-sm text-muted-foreground">Cobrado</span>
                    <span className="numeric p-3 font-semibold text-emerald-700">{formatMoney(order.paid_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-muted/40">
                    <span className="p-3 font-semibold">Saldo pendiente</span>
                    <span className={`numeric p-3 text-lg font-bold ${order.balance_amount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatMoney(order.balance_amount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Entrega</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{deliveryTypeLabels[normalizeDeliveryType(order.delivery_type)]}</span></p>
                    <p><span className="text-muted-foreground">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Modalidad:' : 'Destino:'}</span> <span className="font-medium">{normalizeDeliveryType(order.delivery_type) === 'local' ? 'Recoge en casa · Santa Cruz' : order.destination || '-'}</span></p>
                    <p><span className="text-muted-foreground">Fecha compromiso:</span> <span className="font-medium">{formatDate(order.due_date)}</span></p>
                  </div>
                </div>

                {order.notes ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Notas</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">{order.notes}</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1">Creado</p>
                    <p className="font-medium">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Actualizado</p>
                    <p className="font-medium">{formatDate(order.updated_at)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border text-sm">
                  <div>
                    <p className="p-3 pb-0 text-xs text-muted-foreground">Total</p>
                    <p className="numeric p-3 pt-1 font-semibold">{formatMoney(order.total_amount)}</p>
                  </div>
                  <div>
                    <p className="p-3 pb-0 text-xs text-muted-foreground">Cobrado</p>
                    <p className="numeric p-3 pt-1 font-semibold text-emerald-700">{formatMoney(currentPaid)}</p>
                  </div>
                  <div>
                    <p className="p-3 pb-0 text-xs text-muted-foreground">Saldo</p>
                    <p className={`numeric p-3 pt-1 font-bold ${currentBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatMoney(currentBalance)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Pagos registrados para este pedido</p>
                  {paymentsLoading ? <p className="text-sm text-muted-foreground">Cargando pagos...</p> : null}
                  {paymentsError ? <p className="text-sm text-destructive">{paymentsError}</p> : null}
                  {!paymentsLoading && !paymentsError && payments.length === 0 ? (
                    <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">Aún no hay pagos registrados.</div>
                  ) : null}
                  {payments.map((payment) => (
                    <div key={payment.id} className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-foreground">{payment.payment_method_name}</span>
                        <span className="font-bold text-green-600 dark:text-green-400">+{formatMoney(payment.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(payment.paid_at)}{payment.notes ? ` · ${payment.notes}` : ''}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-semibold text-foreground">Registrar nuevo pago</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm font-medium">
                    <span className="mb-1.5 block">Monto (Bs)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Monto"
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                      className="field-control"
                      required
                      min="0.01"
                      step="0.01"
                    />
                    </label>
                    <label className="text-sm font-medium">
                    <span className="mb-1.5 block">Método de pago</span>
                    <select
                      value={paymentForm.payment_method_id}
                      onChange={(event) => handlePaymentMethodChange(event.target.value)}
                      className="field-control"
                      required
                    >
                      <option value="">Método de pago</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                    </label>
                    <label className="text-sm font-medium">
                    <span className="mb-1.5 block">Fecha</span>
                    <input
                      type="date"
                      value={paymentForm.paid_at}
                      onChange={(event) => setPaymentForm({ ...paymentForm, paid_at: event.target.value })}
                      className="field-control"
                      required
                    />
                    </label>
                    <label className="text-sm font-medium">
                    <span className="mb-1.5 block">Nota <span className="font-normal text-muted-foreground">(opcional)</span></span>
                    <input
                      type="text"
                      placeholder="Notas del pago"
                      value={paymentForm.notes}
                      onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })}
                      className="field-control"
                    />
                    </label>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm flex justify-between">
                    <span className="text-muted-foreground">Nuevo saldo estimado</span>
                    <span className="font-semibold">{formatMoney(nextBalance)}</span>
                  </div>
                  {paymentExceedsBalance ? (
                    <p className="text-sm text-destructive">El pago supera el saldo pendiente del pedido.</p>
                  ) : null}
                  {paymentError ? <p className="text-sm text-destructive">{paymentError}</p> : null}
                  <Button type="submit" className="w-full" disabled={isPaymentPending || paymentMethods.length === 0 || paymentExceedsBalance}>
                    {isPaymentPending ? 'Registrando...' : 'Registrar Pago'}
                  </Button>
                </form>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit2 size={16} className="mr-2" />
                  Editar pedido
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <OrderFormModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        sports={sports}
        paymentMethods={paymentMethods}
        defaultProductionExpense={defaultProductionExpense}
        order={order}
      />
    </>
  )
}
