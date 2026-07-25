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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-card rounded-t-lg md:rounded-lg border border-border w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border p-4 md:p-6 flex items-center justify-between sticky top-0 bg-card">
          <h2 className="text-xl md:text-2xl font-bold">Registrar Gasto</h2>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition" type="button"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Categoría</label>
            <select value={formData.category_id} onChange={(event) => handleCategoryChange(event.target.value)} className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
              <input type="number" placeholder="0.00" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required step="0.01" min="0.01" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Fecha</label>
            <input type="date" value={formData.expense_date} onChange={(event) => setFormData({ ...formData, expense_date: event.target.value })} className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
            <textarea value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="Detalles del gasto..." className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} required />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending || categories.length === 0}>{isPending ? 'Guardando...' : 'Registrar Gasto'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
