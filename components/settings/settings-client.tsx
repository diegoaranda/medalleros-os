'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Edit2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createCatalogItem, setCatalogItemActive, updateCatalogItem, updateFinancialSettings } from '@/app/settings/actions'
import type { Database } from '@/lib/supabase/database.types'

type CatalogTab = 'sports' | 'payments' | 'expenses' | 'financial'
type BasicCatalogItem = Database['public']['Tables']['sports']['Row']
type CatalogItem = BasicCatalogItem

type SettingsClientProps = {
  sports: BasicCatalogItem[]
  paymentMethods: BasicCatalogItem[]
  expenseCategories: BasicCatalogItem[]
  financialSettings: {
    production_expense_default: number
    reserve_percentage: number
  }
  error?: string
}

type FormState = {
  name: string
  description: string
  suggested_price: string
}

const tabs = [
  { id: 'sports', label: 'Deportes', singular: 'deporte' },
  { id: 'payments', label: 'Métodos de Pago', singular: 'método de pago' },
  { id: 'expenses', label: 'Categorías de Gasto', singular: 'categoría de gasto' },
  { id: 'financial', label: 'Finanzas', singular: 'ajuste financiero' },
] as const

function emptyForm(): FormState {
  return { name: '', description: '', suggested_price: '' }
}

export function SettingsClient({ sports, paymentMethods, expenseCategories, financialSettings, error }: SettingsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<CatalogTab>('sports')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [financialForm, setFinancialForm] = useState({
    production_expense_default: String(financialSettings.production_expense_default),
    reserve_percentage: String(financialSettings.reserve_percentage),
  })
  const [isPending, startTransition] = useTransition()

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]
  const currentData = useMemo(() => {
    if (activeTab === 'sports') return sports
    if (activeTab === 'payments') return paymentMethods
    if (activeTab === 'financial') return []
    return expenseCategories
  }, [activeTab, expenseCategories, paymentMethods, sports])

  useEffect(() => {
    setForm(emptyForm())
    setEditingId(null)
    setMessage('')
  }, [activeTab])

  const editingItem = editingId ? currentData.find((item) => item.id === editingId) : null

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id)
    setMessage('')
    setForm({
      name: item.name,
      description: '',
      suggested_price: '',
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setMessage('')
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (activeTab === 'financial') return
    setMessage('')

    startTransition(async () => {
      const result = editingId
        ? await updateCatalogItem(activeTab, editingId, form)
        : await createCatalogItem(activeTab, form)

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      resetForm()
      router.refresh()
    })
  }

  const toggleActive = (item: CatalogItem) => {
    if (activeTab === 'financial') return
    setMessage('')
    startTransition(async () => {
      const result = await setCatalogItemActive(activeTab, item.id, !item.is_active)

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      router.refresh()
    })
  }

  const handleFinancialSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    startTransition(async () => {
      const result = await updateFinancialSettings(financialForm)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage('Configuración financiera actualizada.')
      router.refresh()
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona catálogos y opciones</p>
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto mb-6 mt-8 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm transition whitespace-nowrap border-b-2 ${
              activeTab === tab.id ? 'text-primary border-primary' : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'financial' ? (
        <form onSubmit={handleFinancialSubmit} className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Configuración financiera</h2>
            <p className="text-sm text-muted-foreground mt-1">Estos valores se aplican como base a los pedidos y cálculos financieros.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Gasto base por medallero (Bs)</label>
              <input
                type="number"
                value={financialForm.production_expense_default}
                onChange={(event) => setFinancialForm({ ...financialForm, production_expense_default: event.target.value })}
                className="mt-1 w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Porcentaje de reserva/diezmo</label>
              <input
                type="number"
                value={financialForm.reserve_percentage}
                onChange={(event) => setFinancialForm({ ...financialForm, reserve_percentage: event.target.value })}
                className="mt-1 w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>
          </div>
          {message ? <p className={`text-sm ${message.includes('actualizada') ? 'text-foreground' : 'text-destructive'}`}>{message}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </form>
      ) : (
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-3">
          <h2 className="font-semibold text-foreground">
            {editingItem ? `Editar ${currentTab.singular}` : 'Agregar Nuevo'}
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder={`Nombre del ${currentTab.singular}`}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <div className="flex gap-2">
                {editingItem ? (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isPending}>
                    <X size={18} className="mr-1" />
                    Cancelar
                  </Button>
                ) : null}
                <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
                  {editingItem ? <Check size={18} className="mr-1" /> : <Plus size={20} className="mr-1" />}
                  {isPending ? 'Guardando...' : editingItem ? 'Guardar' : 'Agregar'}
                </Button>
              </div>
            </div>
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
        </form>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border">
            <h2 className="font-semibold text-foreground">{currentTab.label}</h2>
          </div>

          <div className="divide-y divide-border">
            {currentData.length > 0 ? (
              currentData.map((item) => (
                <div key={item.id} className="p-4 md:p-6 flex items-center justify-between gap-4 hover:bg-muted/50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${item.is_active ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(item)} disabled={isPending}>
                      <Edit2 size={16} className="mr-1" />
                      Editar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleActive(item)} disabled={isPending}>
                      {item.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>No hay elementos en este catálogo</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
