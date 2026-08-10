'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createOrder, updateOrder } from '@/app/orders/actions'
import type { OrderWithFinancials } from '@/lib/data/queries'
import type { CatalogOption, OrderFormValues, PaymentMethodOption } from '@/lib/orders/types'
import {
  deliveryTypeLabels,
  emptyOrderFormValues,
  findDefaultPaymentMethod,
  formatMoney,
  operationalDeliveryTypes,
  orderToFormValues,
} from '@/lib/orders/types'
import { DestinationCombobox } from './destination-combobox'

type OrderFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sports: CatalogOption[]
  paymentMethods: PaymentMethodOption[]
  defaultProductionExpense: number
  order?: OrderWithFinancials | null
}

export function OrderFormModal({ open, onOpenChange, sports, paymentMethods, defaultProductionExpense, order }: OrderFormModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [initialValues, setInitialValues] = useState<OrderFormValues>(emptyOrderFormValues)
  const [pendingLocalChange, setPendingLocalChange] = useState(false)
  const [pendingSaveConfirmation, setPendingSaveConfirmation] = useState(false)
  const [formData, setFormData] = useState<OrderFormValues>(emptyOrderFormValues)
  const isEditing = Boolean(order)

  useEffect(() => {
    if (!open) return
    setError('')
    setSuccess('')
    const nextValues = order ? orderToFormValues(order) : emptyOrderFormValues()
    if (!order) nextValues.production_expense = String(defaultProductionExpense)
    const defaultPaymentMethod = findDefaultPaymentMethod(paymentMethods)
    if (!order && defaultPaymentMethod) {
      nextValues.initial_payment_method_id = defaultPaymentMethod.id
      nextValues.initial_payment_method_name = defaultPaymentMethod.name
    }
    setFormData(nextValues)
    setInitialValues(nextValues)
  }, [defaultProductionExpense, open, order, paymentMethods])

  const initialPaymentAmount = Number(formData.initial_payment_amount) || 0
  const balancePreview = useMemo(
    () => Math.max((Number(formData.total_amount) || 0) - (isEditing ? Number(order?.paid_amount ?? 0) : initialPaymentAmount), 0),
    [formData.total_amount, initialPaymentAmount, isEditing, order?.paid_amount],
  )
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialValues)

  if (!open) return null

  const handleSportChange = (sportId: string) => {
    const selectedSport = sports.find((sport) => sport.id === sportId)
    setFormData({
      ...formData,
      sport_id: sportId,
      sport_name: selectedSport?.name ?? '',
    })
  }

  const handleInitialPaymentMethodChange = (paymentMethodId: string) => {
    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId)
    setFormData({
      ...formData,
      initial_payment_method_id: paymentMethodId,
      initial_payment_method_name: selectedMethod?.name ?? '',
    })
  }

  const saveOrder = () => {
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = order ? await updateOrder(order.id, formData) : await createOrder(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
      if (order) {
        setInitialValues(formData)
        setSuccess('Pedido actualizado correctamente.')
      } else {
        onOpenChange(false)
      }
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isEditing && !hasChanges) {
      setError('No hay cambios para guardar.')
      return
    }
    const sensitiveChange = isEditing && (
      order?.status === 'cancelado' ||
      (order?.status === 'entregado' && (
        formData.total_amount !== initialValues.total_amount ||
        formData.production_expense !== initialValues.production_expense ||
        formData.production_cost !== initialValues.production_cost ||
        formData.delivery_type !== initialValues.delivery_type ||
        formData.destination !== initialValues.destination
      ))
    )
    if (sensitiveChange) {
      setPendingSaveConfirmation(true)
      return
    }
    saveOrder()
  }

  const requestDeliveryType = (type: OrderFormValues['delivery_type']) => {
    if (type === formData.delivery_type) return
    if (type === 'local' && formData.delivery_type === 'envio' && formData.destination.trim()) {
      setPendingLocalChange(true)
      return
    }
    setFormData({ ...formData, delivery_type: type, destination: type === 'envio' ? '' : 'Santa Cruz' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-form-title"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-card sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-border"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:py-4">
          <div>
            <p className="eyebrow mb-1">{isEditing ? 'Datos del pedido' : 'Registro rápido'}</p>
            <h2 id="order-form-title" className="text-xl font-bold tracking-[-0.025em]">{isEditing ? 'Editar pedido' : 'Nuevo pedido'}</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar formulario">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
            {isEditing && order?.status === 'entregado' ? <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="shrink-0" />Este pedido ya fue entregado. Los cambios pueden afectar Gastos y Reportes.</div> : null}
            {isEditing && order?.status === 'cancelado' ? <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="shrink-0" />Este pedido está cancelado. La corrección no lo reactivará ni cambiará su estado.</div> : null}
            <fieldset className="space-y-4">
              <legend className="section-title mb-4">Cliente y pedido</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="request-number" className="field-label">N.º de solicitud</label>
                  <input id="request-number" type="text" placeholder="Ej. SOL-1024" value={formData.request_number} onChange={(event) => setFormData({ ...formData, request_number: event.target.value })} className="field-control" required autoFocus />
                </div>
                <div>
                  <label htmlFor="customer-name" className="field-label">Nombre del cliente</label>
                  <input id="customer-name" type="text" autoComplete="name" placeholder="Nombre completo" value={formData.customer_name} onChange={(event) => setFormData({ ...formData, customer_name: event.target.value })} className="field-control" required />
                </div>
                <div>
                  <label htmlFor="customer-phone" className="field-label">WhatsApp</label>
                  <input id="customer-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej. 70000000" value={formData.customer_phone} onChange={(event) => setFormData({ ...formData, customer_phone: event.target.value })} className="field-control" required />
                </div>
                <div>
                  <label htmlFor="order-sport" className="field-label">Deporte</label>
                  <select id="order-sport" value={formData.sport_id} onChange={(event) => handleSportChange(event.target.value)} className="field-control" required>
                    <option value="">Selecciona un deporte</option>
                    {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-border pt-5">
              <legend className="section-title mb-4">Precio y anticipo</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="total-amount" className="field-label">Precio total (Bs)</label>
                  <input id="total-amount" type="number" inputMode="decimal" placeholder="0,00" value={formData.total_amount} onChange={(event) => setFormData({ ...formData, total_amount: event.target.value })} className="field-control numeric" required min="0" step="0.01" />
                </div>
                {!isEditing ? (
                  <div>
                    <label htmlFor="advance-amount" className="field-label">Anticipo (Bs)</label>
                    <input id="advance-amount" type="number" inputMode="decimal" placeholder="0,00" value={formData.initial_payment_amount} onChange={(event) => setFormData({ ...formData, initial_payment_amount: event.target.value })} className="field-control numeric" min="0" step="0.01" />
                  </div>
                ) : null}
                {!isEditing ? (
                  <div>
                    <label htmlFor="advance-method" className="field-label">Método de pago</label>
                    <select id="advance-method" value={formData.initial_payment_method_id} onChange={(event) => handleInitialPaymentMethodChange(event.target.value)} className="field-control" disabled={paymentMethods.length === 0}>
                      <option value="">Sin método</option>
                      {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
                    </select>
                  </div>
                ) : null}
                <div>
                  <span className="field-label">Saldo estimado</span>
                  <div className={`numeric flex min-h-11 items-center rounded-lg border px-3.5 font-bold ${balancePreview > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} aria-live="polite">
                    {formatMoney(balancePreview)}
                  </div>
                </div>
              </div>
              {!isEditing ? (
                <div>
                  <label htmlFor="advance-note" className="field-label">Nota del anticipo <span className="font-normal text-muted-foreground">(opcional)</span></label>
                  <input id="advance-note" type="text" value={formData.initial_payment_notes} onChange={(event) => setFormData({ ...formData, initial_payment_notes: event.target.value })} className="field-control" placeholder="Ej. comprobante enviado por WhatsApp" />
                </div>
              ) : null}
            </fieldset>

            <fieldset className="space-y-4 border-t border-border pt-5">
              <legend className="section-title mb-4">Entrega</legend>
              <div>
                <span className="field-label">Tipo de entrega</span>
                <div className="grid grid-cols-2 rounded-lg border border-input bg-muted p-1" role="group" aria-label="Tipo de entrega">
                  {operationalDeliveryTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => requestDeliveryType(type)}
                      className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${formData.delivery_type === type ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      aria-pressed={formData.delivery_type === type}
                    >
                      {deliveryTypeLabels[type]}
                    </button>
                  ))}
                </div>
                {formData.delivery_type === 'local' ? <p className="field-help">Recoge en casa · Santa Cruz</p> : null}
              </div>
              {formData.delivery_type === 'envio' ? <DestinationCombobox value={formData.destination} onChange={(destination) => setFormData({ ...formData, destination })} /> : null}
              <div>
                <label htmlFor="due-date" className="field-label">Fecha de compromiso</label>
                <input id="due-date" type="date" value={formData.due_date} onChange={(event) => setFormData({ ...formData, due_date: event.target.value })} className="field-control" />
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-border pt-5">
              <legend className="section-title mb-4">Información interna</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="production-expense" className="field-label">Gasto de producción (Bs)</label>
                  <input id="production-expense" type="number" inputMode="decimal" placeholder="30,00" value={formData.production_expense} onChange={(event) => setFormData({ ...formData, production_expense: event.target.value })} className="field-control numeric" required min="0" step="0.01" />
                </div>
                {isEditing ? <div>
                  <label htmlFor="production-cost" className="field-label">Costo de Eugenio (Bs) <span className="font-normal text-muted-foreground">(opcional)</span></label>
                  <input id="production-cost" type="number" inputMode="decimal" value={formData.production_cost} onChange={(event) => setFormData({ ...formData, production_cost: event.target.value })} className="field-control numeric" min="0" step="0.01" />
                </div> : null}
                {isEditing ? <div>
                  <label htmlFor="production-notes" className="field-label">Nota de producción <span className="font-normal text-muted-foreground">(opcional)</span></label>
                  <textarea id="production-notes" value={formData.production_notes} onChange={(event) => setFormData({ ...formData, production_notes: event.target.value })} className="field-control min-h-24 resize-y py-3" rows={3} />
                </div> : null}
                <div>
                  <label htmlFor="order-notes" className="field-label">Notas <span className="font-normal text-muted-foreground">(opcional)</span></label>
                  <textarea id="order-notes" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} placeholder="Medidas, color, detalles…" className="field-control min-h-24 resize-y py-3" rows={3} />
                </div>
              </div>
            </fieldset>

            {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p> : null}
            {success ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{success}</p> : null}
          </div>

          <div className="grid shrink-0 grid-cols-[0.8fr_1.2fr] gap-3 border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending || Boolean(success) || (isEditing && !hasChanges)} aria-busy={isPending}>
              {isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear pedido'}
            </Button>
          </div>
        </form>
      </div>
      {pendingLocalChange ? <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"><div role="alertdialog" aria-modal="true" className="w-full bg-card p-5 sm:max-w-md sm:rounded-xl sm:border"><h3 className="text-xl font-bold">¿Cambiar a entrega local?</h3><p className="mt-3 text-sm text-muted-foreground">Se eliminarán los datos exclusivos del envío, como destino y transporte. El pedido quedará registrado como entrega local en Santa Cruz.</p><div className="mt-5 flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setPendingLocalChange(false)}>Cancelar</Button><Button className="flex-1" onClick={() => { setFormData({ ...formData, delivery_type: 'local', destination: 'Santa Cruz' }); setPendingLocalChange(false) }}>Cambiar a local</Button></div></div></div> : null}
      {pendingSaveConfirmation ? <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"><div role="alertdialog" aria-modal="true" className="w-full bg-card p-5 sm:max-w-md sm:rounded-xl sm:border"><h3 className="text-xl font-bold">¿Guardar correcciones?</h3><p className="mt-3 text-sm text-muted-foreground">Este pedido está {order?.status === 'entregado' ? 'entregado' : 'cancelado'}. Los cambios financieros o de entrega pueden afectar Gastos y Reportes, pero no cambiarán su estado.</p><div className="mt-5 flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setPendingSaveConfirmation(false)}>Cancelar</Button><Button className="flex-1" onClick={() => { setPendingSaveConfirmation(false); saveOrder() }}>Guardar cambios</Button></div></div></div> : null}
    </div>
  )
}
