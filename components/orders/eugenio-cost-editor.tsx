'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { Pencil, X } from 'lucide-react'
import { updateEugenioCost } from '@/app/production/actions'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/orders/types'
import { hasValidEugenioCost } from '@/lib/orders/production'

type EugenioCostEditorProps = {
  orderId: string
  initialCost: number | null
  onUpdated?: (cost: number) => void
}

export function EugenioCostEditor({ orderId, initialCost, onUpdated }: EugenioCostEditorProps) {
  const inputId = useId()
  const titleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [cost, setCost] = useState(initialCost)
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()
  const hasCost = hasValidEugenioCost(cost)

  useEffect(() => setCost(initialCost), [initialCost])

  useEffect(() => {
    if (!open) return
    setValue(hasCost ? String(cost) : '')
    setError('')
    requestAnimationFrame(() => inputRef.current?.focus())

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        setOpen(false)
        requestAnimationFrame(() => triggerRef.current?.focus())
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [cost, hasCost, isPending, open])

  const closeEditor = () => {
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await updateEugenioCost(orderId, value)
      if (!result.ok) {
        setError(result.error)
        return
      }

      setCost(result.data.production_cost)
      onUpdated?.(result.data.production_cost)
      setSuccess('Costo de Eugenio actualizado.')
      closeEditor()
    })
  }

  return (
    <>
      <div>
        <p className="text-xs text-muted-foreground">Costo de Eugenio</p>
        <p className={`numeric mt-0.5 font-semibold ${hasCost ? 'text-amber-700' : 'text-red-700'}`}>{hasCost ? formatMoney(cost) : 'Pendiente'}</p>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => { setSuccess(''); setOpen(true) }}
          className="mt-1 inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil size={14} aria-hidden="true" />
          {hasCost ? 'Editar costo' : 'Registrar costo'}
        </button>
      </div>

      {success ? <p role="status" className="mt-2 text-sm font-medium text-emerald-700">{success}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full bg-card sm:max-w-sm sm:rounded-xl sm:border sm:border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <h2 id={titleId} className="text-xl font-bold tracking-[-0.025em]">Costo de Eugenio</h2>
              <button type="button" onClick={closeEditor} disabled={isPending} aria-label="Cerrar editor de costo" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
              <div>
                <label htmlFor={inputId} className="field-label">Costo de Eugenio</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">Bs</span>
                  <input ref={inputRef} id={inputId} type="text" inputMode="decimal" required value={value} onChange={(event) => setValue(event.target.value)} disabled={isPending} className="field-control numeric pl-11" />
                </div>
              </div>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={closeEditor} disabled={isPending} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Guardando…' : 'Guardar costo'}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
