'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
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
  const [formData, setFormData] = useState<OrderFormValues>(emptyOrderFormValues)
  const isEditing = Boolean(order)

  useEffect(() => {
    if (!open) return
    setError('')
    const nextValues = order ? orderToFormValues(order) : emptyOrderFormValues()
    if (!order) nextValues.production_expense = String(defaultProductionExpense)
    const defaultPaymentMethod = findDefaultPaymentMethod(paymentMethods)
    if (!order && defaultPaymentMethod) {
      nextValues.initial_payment_method_id = defaultPaymentMethod.id
      nextValues.initial_payment_method_name = defaultPaymentMethod.name
    }
    setFormData(nextValues)
  }, [defaultProductionExpense, open, order, paymentMethods])

  const initialPaymentAmount = Number(formData.initial_payment_amount) || 0
  const balancePreview = useMemo(
    () => Math.max((Number(formData.total_amount) || 0) - (isEditing ? 0 : initialPaymentAmount), 0),
    [formData.total_amount, initialPaymentAmount, isEditing],
  )

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      const result = order ? await updateOrder(order.id, formData) : await createOrder(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
      onOpenChange(false)
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-card rounded-t-lg md:rounded-lg border border-border w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 md:p-6 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">{isEditing ? 'Editar pedido' : 'Nuevo pedido'}</h2>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition" type="button">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Información del Cliente</h3>
            <div>
              <label className="text-sm text-muted-foreground">N.º de solicitud</label>
              <input
                type="text"
                placeholder="Ej. SOL-1024"
                value={formData.request_number}
                onChange={(event) => setFormData({ ...formData, request_number: event.target.value })}
                className="mt-1 w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={formData.customer_name}
              onChange={(event) => setFormData({ ...formData, customer_name: event.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <input
              type="tel"
              placeholder="WhatsApp o teléfono"
              value={formData.customer_phone}
              onChange={(event) => setFormData({ ...formData, customer_phone: event.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Detalles del pedido</h3>
            <div className="grid grid-cols-1 gap-3">
              <select
                value={formData.sport_id}
                onChange={(event) => handleSportChange(event.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Selecciona deporte</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Precios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Precio de venta</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.total_amount}
                  onChange={(event) => setFormData({ ...formData, total_amount: event.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Saldo estimado</label>
                <div className="w-full px-4 py-2 rounded-lg border border-border bg-muted/50 text-foreground mt-1 font-semibold">
                  {formatMoney(balancePreview)}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Gasto de producción</label>
              <input
                type="number"
                placeholder="30.00"
                value={formData.production_expense}
                onChange={(event) => setFormData({ ...formData, production_expense: event.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                required
                min="0"
                step="0.01"
              />
            </div>

            {!isEditing ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Anticipo inicial</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Monto del anticipo</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.initial_payment_amount}
                      onChange={(event) => setFormData({ ...formData, initial_payment_amount: event.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Método de pago</label>
                    <select
                      value={formData.initial_payment_method_id}
                      onChange={(event) => handleInitialPaymentMethodChange(event.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                      disabled={paymentMethods.length === 0}
                    >
                      <option value="">Sin método</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Nota opcional del pago"
                  value={formData.initial_payment_notes}
                  onChange={(event) => setFormData({ ...formData, initial_payment_notes: event.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">El saldo se calcula automáticamente desde los pagos registrados.</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={formData.delivery_type}
                onChange={(event) => {
                  const deliveryType = event.target.value as OrderFormValues['delivery_type']
                  setFormData({
                    ...formData,
                    delivery_type: deliveryType,
                    destination: deliveryType === 'envio' ? '' : 'Santa Cruz',
                  })
                }}
                className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {operationalDeliveryTypes.map((type) => (
                  <option key={type} value={type}>{deliveryTypeLabels[type]}</option>
                ))}
              </select>
              {formData.delivery_type === 'envio' ? (
                <DestinationCombobox
                  value={formData.destination}
                  onChange={(destination) => setFormData({ ...formData, destination })}
                />
              ) : null}
            </div>
            {formData.delivery_type === 'local' ? (
              <p className="text-xs text-muted-foreground">Recoge en casa · Santa Cruz</p>
            ) : null}
            <input
              type="date"
              value={formData.due_date}
              onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Notas adicionales</label>
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Agregar notas o especificaciones..."
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </div>

          {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Pedido'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
