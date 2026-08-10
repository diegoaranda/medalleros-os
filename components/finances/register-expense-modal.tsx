'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createExpense } from '@/app/finances/actions'
import type { Database } from '@/lib/supabase/database.types'

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']

type RegisterExpenseModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: ExpenseCategory[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function RegisterExpenseModal({ open, onOpenChange, categories }: RegisterExpenseModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    category_id: '',
    category_name: '',
    amount: '',
    expense_date: today(),
    description: '',
  })

  useEffect(() => {
    if (!open) return
    const firstCategory = categories[0]
    setError('')
    setFormData({
      category_id: firstCategory?.id ?? '',
      category_name: firstCategory?.name ?? '',
      amount: '',
      expense_date: today(),
      description: '',
    })
  }, [categories, open])

  if (!open) return null

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId)
    setFormData({ ...formData, category_id: categoryId, category_name: category?.name ?? '' })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await createExpense(formData)

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
      <div role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" className="max-h-[100dvh] w-full overflow-y-auto bg-card sm:max-w-lg sm:rounded-xl sm:border sm:border-border">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:py-4">
          <h2 id="expense-modal-title" className="text-xl font-bold tracking-[-0.025em]">Registrar gasto</h2>
          <button onClick={() => onOpenChange(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label="Cerrar formulario"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <div>
            <label htmlFor="expense-category" className="field-label">Categoría</label>
            <select id="expense-category" value={formData.category_id} onChange={(event) => handleCategoryChange(event.target.value)} className="field-control" required>
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="expense-amount" className="field-label">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input id="expense-amount" type="text" inputMode="decimal" placeholder="0,00" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} className="field-control numeric pl-11" required />
            </div>
          </div>

          <div>
            <label htmlFor="expense-date" className="field-label">Fecha</label>
            <input id="expense-date" type="date" value={formData.expense_date} onChange={(event) => setFormData({ ...formData, expense_date: event.target.value })} className="field-control" required />
          </div>

          <div>
            <label htmlFor="expense-description" className="field-label">Descripción</label>
            <textarea id="expense-description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="Detalles del gasto…" className="field-control min-h-24 resize-y py-3" rows={3} required />
          </div>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending || categories.length === 0} aria-busy={isPending}>{isPending ? 'Guardando…' : 'Registrar gasto'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
