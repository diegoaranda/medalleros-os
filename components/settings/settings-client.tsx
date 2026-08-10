'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Edit2, ListPlus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
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
  { id: 'financial', label: 'Gastos', singular: 'ajuste financiero' },
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
    <div className="app-page max-w-5xl">
      <PageHeader title="Configuración" eyebrow="Administración" description="Gestiona catálogos y valores base de Medalleros OS." />

      {error ? (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-border px-1" role="tablist" aria-label="Secciones de configuración">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id ? 'text-primary border-primary' : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'financial' ? (
        <form onSubmit={handleFinancialSubmit} className="surface space-y-5 p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-foreground">Configuración financiera</h2>
            <p className="text-sm text-muted-foreground mt-1">Estos valores se aplican como base a los pedidos y cálculos financieros.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="default-production-expense" className="field-label">Gasto base por medallero (Bs)</label>
              <input
                id="default-production-expense"
                type="text"
                value={financialForm.production_expense_default}
                onChange={(event) => setFinancialForm({ ...financialForm, production_expense_default: event.target.value })}
                className="field-control numeric"
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <label htmlFor="reserve-percentage" className="field-label">Porcentaje de reserva/diezmo</label>
              <input
                id="reserve-percentage"
                type="number"
                value={financialForm.reserve_percentage}
                onChange={(event) => setFinancialForm({ ...financialForm, reserve_percentage: event.target.value })}
                className="field-control numeric"
                inputMode="decimal"
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
        <form onSubmit={handleSubmit} className="surface space-y-4 p-4 sm:p-5">
          <h2 className="font-semibold text-foreground">
            {editingItem ? `Editar ${currentTab.singular}` : 'Agregar Nuevo'}
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <label className="flex-1">
              <span className="field-label">Nombre</span>
              <input
                type="text"
                placeholder={`Nombre del ${currentTab.singular}`}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="field-control"
                required
              />
              </label>
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

        <div className="surface overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="section-title">{currentTab.label}</h2>
          </div>

          <div className="divide-y divide-border">
            {currentData.length > 0 ? (
              currentData.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2">
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
              <EmptyState icon={ListPlus} title={`No hay ${currentTab.label.toLocaleLowerCase('es')} todavía.`} description="Agrega el primer elemento usando el formulario superior." />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
