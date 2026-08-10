const MONEY_PATTERN = /^\d+(?:[.,]\d{1,2})?$/

export function normalizeMoneyInput(value: string) {
  return value.trim().replace(',', '.')
}

export function parseMoneyInput(value: string) {
  const trimmed = value.trim()
  if (!MONEY_PATTERN.test(trimmed)) return Number.NaN

  const amount = Number(normalizeMoneyInput(trimmed))
  return Number.isFinite(amount) ? amount : Number.NaN
}

export function formatMoneyAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0)
  const hasDecimals = Math.abs(amount % 1) > Number.EPSILON

  return `Bs ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}
