'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  deleteOrderPayment,
  listOrderPayments,
  registerOrderPayment,
  updateOrderPayment,
  updateOrderStatus,
} from '@/app/orders/actions'
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
import { OrderAdminActions } from '@/app/orders/admin/order-admin-actions'
import { OrderFormModal } from './order-form-modal'
import { parseMoneyInput } from '@/lib/money'

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

function paymentFormFrom(payment: OrderPayment): PaymentFormValues {
  return {
    amount: String(payment.amount),
    payment_method_id: payment.payment_method_id ?? '',
    payment_method_name: payment.payment_method_name,
    paid_at: payment.paid_at.slice(0, 10),
    notes: payment.notes ?? '',
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
  const [paymentCorrectionError, setPaymentCorrectionError] = useState('')
  const [paymentCorrectionMessage, setPaymentCorrectionMessage] = useState('')
  const [editingPayment, setEditingPayment] = useState<OrderPayment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<OrderPayment | null>(null)
  const [editPaymentForm, setEditPaymentForm] = useState<PaymentFormValues | null>(null)
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isPaymentPending, startPaymentTransition] = useTransition()
  const [isCorrectionPending, startCorrectionTransition] = useTransition()
  const [paymentForm, setPaymentForm] = useState<PaymentFormValues>(() => emptyPaymentForm(order.balance_amount, paymentMethods))

  useEffect(() => {
    if (!open) return
    setActiveTab(initialTab)
    setStatusError('')
    setPaymentError('')
    setPaymentCorrectionError('')
    setPaymentCorrectionMessage('')
    setEditingPayment(null)
    setDeletingPayment(null)
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
  const parsedNextPayment = parseMoneyInput(paymentForm.amount)
  const nextPaymentAmount = Number.isFinite(parsedNextPayment) ? parsedNextPayment : 0
  const paymentExceedsBalance = nextPaymentAmount > currentBalance
  const nextBalance = Math.max(currentBalance - nextPaymentAmount, 0)
  const parsedEditedAmount = parseMoneyInput(editPaymentForm?.amount ?? '')
  const otherPaymentsTotal = editingPayment ? paidAmount - Number(editingPayment.amount) : paidAmount
  const maximumEditedPayment = Math.max(Number(order.total_amount) - otherPaymentsTotal, 0)
  const editedPaymentExceedsMaximum = Number.isFinite(parsedEditedAmount) && parsedEditedAmount > maximumEditedPayment

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

  const openPaymentEditor = (payment: OrderPayment) => {
    setPaymentCorrectionError('')
    setPaymentCorrectionMessage('')
    setEditingPayment(payment)
    setEditPaymentForm(paymentFormFrom(payment))
  }

  const handleEditPaymentMethodChange = (paymentMethodId: string) => {
    if (!editPaymentForm) return
    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId)
    setEditPaymentForm({
      ...editPaymentForm,
      payment_method_id: paymentMethodId,
      payment_method_name: selectedMethod?.name ?? '',
    })
  }

  const handlePaymentUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingPayment || !editPaymentForm) return
    setPaymentCorrectionError('')

    startCorrectionTransition(async () => {
      const result = await updateOrderPayment(order.id, editingPayment.id, editPaymentForm)
      if (!result.ok) {
        setPaymentCorrectionError(result.error)
        return
      }

      setPayments((current) => current.map((payment) => (payment.id === result.data.id ? result.data : payment)))
      setEditingPayment(null)
      setEditPaymentForm(null)
      setPaymentCorrectionMessage('Pago actualizado correctamente.')
      router.refresh()
    })
  }

  const handlePaymentDelete = () => {
    if (!deletingPayment) return
    setPaymentCorrectionError('')

    startCorrectionTransition(async () => {
      const result = await deleteOrderPayment(order.id, deletingPayment.id)
      if (!result.ok) {
        setPaymentCorrectionError(result.error)
        return
      }

      setPayments((current) => current.filter((payment) => payment.id !== deletingPayment.id))
      setDeletingPayment(null)
      setPaymentCorrectionMessage('Pago eliminado correctamente.')
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
                      disabled={isStatusPending || order.status === 'entregado' || order.status === 'cancelado'}
                    >
                      {operationalOrderStatuses.filter((status) => status !== 'cancelado' || order.status === 'cancelado').map((status) => (
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

                {Number(order.production_cost) <= 0 ? (
                  <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    <AlertTriangle size={16} className="shrink-0" />
                    Costo Eugenio pendiente
                  </div>
                ) : null}

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

                {normalizeOrderStatus(order.status) === 'entregado' && currentBalance > 0 ? (
                  <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    Este pedido está entregado y mantiene un saldo pendiente de {formatMoney(currentBalance)}.
                  </div>
                ) : null}

                {paymentCorrectionMessage ? (
                  <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                    {paymentCorrectionMessage}
                  </p>
                ) : null}

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Pagos registrados para este pedido</p>
                  {paymentsLoading ? <p className="text-sm text-muted-foreground">Cargando pagos...</p> : null}
                  {paymentsError ? <p className="text-sm text-destructive">{paymentsError}</p> : null}
                  {!paymentsLoading && !paymentsError && payments.length === 0 ? (
                    <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">Aún no hay pagos registrados.</div>
                  ) : null}
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/10">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-foreground">{payment.payment_method_name}</span>
                        <span className="font-bold text-green-600 dark:text-green-400">+{formatMoney(payment.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(payment.paid_at)}{payment.notes ? ` · ${payment.notes}` : ''}</p>
                      <div className="mt-3 flex gap-2 border-t border-green-200 pt-3 dark:border-green-900/30">
                        <Button type="button" variant="outline" size="sm" onClick={() => openPaymentEditor(payment)}>Editar</Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setPaymentCorrectionError('')
                            setPaymentCorrectionMessage('')
                            setDeletingPayment(payment)
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-semibold text-foreground">Registrar nuevo pago</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm font-medium">
                    <span className="mb-1.5 block">Monto (Bs)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Monto"
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                      className="field-control"
                      required
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
                <OrderAdminActions order={order} onCompleted={() => onOpenChange(false)} />
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

      {editingPayment && editPaymentForm ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <form onSubmit={handlePaymentUpdate} role="dialog" aria-modal="true" aria-labelledby="edit-payment-title" className="w-full space-y-4 bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-xl sm:border sm:border-border sm:pb-5">
            <div>
              <h2 id="edit-payment-title" className="text-xl font-bold">Editar pago</h2>
              <p className="mt-1 text-sm text-muted-foreground">Monto máximo disponible: {formatMoney(maximumEditedPayment)}</p>
            </div>
            <label className="block text-sm font-medium">
              <span className="mb-1.5 block">Monto (Bs)</span>
              <input type="text" inputMode="decimal" value={editPaymentForm.amount} onChange={(event) => setEditPaymentForm({ ...editPaymentForm, amount: event.target.value })} className="field-control" required autoFocus />
            </label>
            <label className="block text-sm font-medium">
              <span className="mb-1.5 block">Método de pago</span>
              <select value={editPaymentForm.payment_method_id} onChange={(event) => handleEditPaymentMethodChange(event.target.value)} className="field-control" required>
                <option value="">Método de pago</option>
                {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              <span className="mb-1.5 block">Fecha</span>
              <input type="date" value={editPaymentForm.paid_at} onChange={(event) => setEditPaymentForm({ ...editPaymentForm, paid_at: event.target.value })} className="field-control" required />
            </label>
            <label className="block text-sm font-medium">
              <span className="mb-1.5 block">Nota <span className="font-normal text-muted-foreground">(opcional)</span></span>
              <input type="text" value={editPaymentForm.notes} onChange={(event) => setEditPaymentForm({ ...editPaymentForm, notes: event.target.value })} className="field-control" />
            </label>
            {editedPaymentExceedsMaximum ? <p role="alert" className="text-sm text-destructive">El pago supera el saldo disponible del pedido.</p> : null}
            {paymentCorrectionError ? <p role="alert" className="text-sm text-destructive">{paymentCorrectionError}</p> : null}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingPayment(null); setEditPaymentForm(null) }} disabled={isCorrectionPending}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={isCorrectionPending || editedPaymentExceedsMaximum}>{isCorrectionPending ? 'Guardando…' : 'Guardar cambios'}</Button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingPayment ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-payment-title" aria-describedby="delete-payment-description" className="w-full bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-xl sm:border sm:border-border sm:pb-5">
            <h2 id="delete-payment-title" className="text-xl font-bold">¿Eliminar este pago?</h2>
            <p id="delete-payment-description" className="mt-3 text-sm text-muted-foreground">Se eliminará el registro de pago y el saldo pendiente del pedido se recalculará automáticamente.</p>
            <p className="numeric mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 font-semibold">Pago a eliminar: {formatMoney(deletingPayment.amount)}</p>
            {paymentCorrectionError ? <p role="alert" className="mt-3 text-sm text-destructive">{paymentCorrectionError}</p> : null}
            <div className="mt-5 flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDeletingPayment(null)} disabled={isCorrectionPending}>Cancelar</Button>
              <Button type="button" variant="destructive" className="flex-1" onClick={handlePaymentDelete} disabled={isCorrectionPending}>{isCorrectionPending ? 'Eliminando…' : 'Eliminar pago'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
