'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { OrderWithFinancials } from '@/lib/data/queries'
import { formatDate, formatMoney, statusLabels } from '@/lib/orders/types'
import { applyOrderAdminAction, getOrderAdminSnapshot } from './actions'
import { needsFinancialConfirmation, type OrderAdminAction, type OrderAdminSnapshot } from './types'

const actionLabels: Record<OrderAdminAction, string> = {
  cancel: 'Cancelar pedido', delete: 'Eliminar pedido', undo_delivery: 'Deshacer entrega',
}

export function OrderAdminActions({ order, onCompleted }: { order: OrderWithFinancials; onCompleted: () => void }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = useRef(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [action, setAction] = useState<OrderAdminAction | null>(null)
  const [snapshot, setSnapshot] = useState<OrderAdminSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!action) return
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [action])

  async function loadSnapshot() {
    setLoading(true)
    setSnapshot(null)
    setConfirmed(false)
    setError('')
    try {
      const result = await getOrderAdminSnapshot(order.id)
      if (result.ok) setSnapshot(result.data)
      else setError(result.error)
    } catch {
      setError('No se pudo cargar el pedido. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function openAction(next: OrderAdminAction) {
    returnFocus.current = document.activeElement as HTMLElement
    setAction(next)
    setMessage('')
    void loadSnapshot()
  }

  function close() {
    if (busy.current || loading) return
    setAction(null)
    returnFocus.current?.focus()
  }

  async function confirmAction() {
    if (!snapshot || !action || busy.current) return
    if (action === 'delete' && needsFinancialConfirmation(snapshot) && !confirmed) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      const result = await applyOrderAdminAction(order.id, action, snapshot.revision, confirmed)
      if (!result.ok) {
        setError(result.error)
        setSnapshot(null)
        setConfirmed(false)
        return
      }
      setMessage(action === 'undo_delivery'
        ? 'Entrega deshecha. El pedido vuelve a Entregas como envuelto y conserva sus pagos.'
        : action === 'cancel' ? 'Pedido cancelado. Sus datos y pagos se conservaron.' : 'Pedido eliminado permanentemente.')
      setAction(null)
      router.refresh()
      onCompleted()
    } catch {
      setError('No se pudo confirmar el resultado. Carga el pedido de nuevo antes de reintentar.')
      setSnapshot(null)
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  const requiresExtra = snapshot && action === 'delete' && needsFinancialConfirmation(snapshot)
  const unavailable = snapshot && ((action === 'undo_delivery' && snapshot.order.status !== 'entregado') || (action === 'cancel' && snapshot.order.status === 'cancelado'))

  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Acciones administrativas">
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-muted-foreground">Acciones administrativas</summary>
        <p className="mb-3 text-sm text-muted-foreground">Correcciones de pedidos duplicados o errores operativos.</p>
        <div className="flex flex-col gap-2">
          {order.status !== 'cancelado' ? <Button type="button" variant="outline" onClick={() => openAction('cancel')}>Cancelar pedido</Button> : null}
          {order.status === 'entregado' ? <Button type="button" variant="outline" onClick={() => openAction('undo_delivery')}>Deshacer entrega</Button> : null}
          <Button type="button" variant="destructive" onClick={() => openAction('delete')}>Eliminar pedido</Button>
        </div>
      </details>
      {message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}
      {action ? (
        <dialog ref={dialog} aria-labelledby="order-admin-title" aria-describedby="order-admin-description"
          onCancel={(event) => { event.preventDefault(); close() }}
          className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60">
          <div className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6" aria-busy={pending || loading}>
            <h2 id="order-admin-title" className="text-xl font-bold">{actionLabels[action]}</h2>
            <p id="order-admin-description" className={`text-sm ${action === 'delete' ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
              {action === 'delete' ? 'Esta acción eliminará permanentemente el pedido y sus pagos asociados. No se puede deshacer.'
                : action === 'cancel' ? 'El pedido saldrá de Producción y Entregas. Se conservarán sus datos, pagos e historial. Los pagos no se considerarán devueltos.'
                  : 'El pedido volverá a Entregas como listo (envuelto). Se limpiará la fecha de entrega efectiva y se conservarán sus pagos.'}
            </p>
            {action === 'undo_delivery' ? <p className="text-sm text-muted-foreground">Los pagos incorrectos pueden editarse o eliminarse desde la pestaña Pagos del detalle en Pedidos. Esta corrección no enviará notificaciones push de entrega.</p> : null}
            {loading ? <p role="status" className="text-sm">Cargando datos actuales…</p> : null}
            {snapshot ? <>
              <dl className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                {[
                  ['Cliente', snapshot.order.customer_name], ['N.º de solicitud', snapshot.order.request_number],
                  ['Precio total', formatMoney(snapshot.order.total_amount)], ['Pagos registrados', formatMoney(snapshot.order.paid_amount)],
                  ['Saldo pendiente', formatMoney(snapshot.order.balance_amount)], ['Costo de Eugenio', snapshot.order.production_cost === null ? 'Sin registrar' : formatMoney(snapshot.order.production_cost)],
                  ['Gasto de producción', formatMoney(snapshot.order.production_expense)], ['Estado actual', statusLabels[snapshot.order.status]],
                ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}
              </dl>
              <div className="text-sm">
                <p className="mb-2 font-semibold">Pagos registrados ({snapshot.payments.length})</p>
                {snapshot.payments.length === 0 ? <p className="text-muted-foreground">Sin pagos registrados.</p> : <ul className="divide-y divide-border rounded-lg border border-border px-3">{snapshot.payments.map((payment) => <li key={payment.id} className="py-2"><p className="flex flex-wrap justify-between gap-2"><span>{payment.payment_method_name}</span><strong>{formatMoney(payment.amount)}</strong></p><p className="break-words text-xs text-muted-foreground">{formatDate(payment.paid_at)}{payment.notes ? ` · ${payment.notes}` : ''}</p></li>)}</ul>}
              </div>
              {requiresExtra ? <label className="flex min-h-11 items-start gap-3 rounded-lg border border-destructive/30 p-3 text-sm"><input type="checkbox" checked={confirmed} disabled={pending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-5 shrink-0" /><span>Confirmo explícitamente que deseo eliminar el pedido, sus pagos y los costos registrados que se muestran arriba.</span></label> : null}
              {unavailable ? <p role="alert" className="text-sm">Esta acción ya no está disponible para el estado actual del pedido.</p> : null}
            </> : null}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            {!loading && !snapshot ? <Button type="button" variant="outline" onClick={() => void loadSnapshot()} disabled={pending}>Volver a cargar confirmación</Button> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="flex-1" onClick={close} disabled={pending || loading} autoFocus>Volver</Button>
              <Button type="button" variant={action === 'delete' ? 'destructive' : 'secondary'} className="flex-1" onClick={() => void confirmAction()} disabled={pending || loading || !snapshot || !!unavailable || (!!requiresExtra && !confirmed)}>{pending ? 'Procesando…' : actionLabels[action]}</Button>
            </div>
          </div>
        </dialog>
      ) : null}
    </section>
  )
}
