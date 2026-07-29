export const MISSING_EUGENIO_COST_ERROR =
  'Debes registrar el costo de Eugenio antes de pasar el pedido a Entregas.'

export function hasValidEugenioCost(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false

  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) && amount > 0
}
