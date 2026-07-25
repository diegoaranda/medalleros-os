import { getFinancialSettings, getSettingsCatalogs } from '@/lib/data/queries'
import { SettingsClient } from '@/components/settings/settings-client'
import { DEFAULT_PRODUCTION_EXPENSE, DEFAULT_RESERVE_PERCENTAGE } from '@/lib/finance/calculations'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const catalogs = await getSettingsCatalogs()
  let financialSettings = {
    production_expense_default: DEFAULT_PRODUCTION_EXPENSE,
    reserve_percentage: DEFAULT_RESERVE_PERCENTAGE,
  }
  let financialError = ''

  try {
    financialSettings = await getFinancialSettings()
  } catch {
    financialError = 'No se pudo cargar la configuración financiera desde Supabase.'
  }

  const catalogError = catalogs.errors.length > 0 ? 'Algunos catálogos no pudieron cargarse desde Supabase.' : ''

  return (
    <SettingsClient
      sports={catalogs.sports}
      paymentMethods={catalogs.paymentMethods}
      expenseCategories={catalogs.expenseCategories}
      financialSettings={financialSettings}
      error={catalogError || financialError}
    />
  )
}
