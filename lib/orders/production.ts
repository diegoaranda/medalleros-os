export function hasValidEugenioCost(value: unknown): boolean {
  const cost = Number(value)
  return Number.isFinite(cost) && cost > 0
}
