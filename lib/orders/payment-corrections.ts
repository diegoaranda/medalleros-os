import { parseMoneyInput } from '@/lib/money'

function toCents(value: number) {
  return Math.round(value * 100)
}

export function validatePaymentCorrection(amountInput: string, orderTotal: number, otherPaymentsTotal: number) {
  const amount = parseMoneyInput(amountInput)

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: 'Ingresa un monto de pago válido.' }
  }

  if (toCents(amount) + toCents(otherPaymentsTotal) > toCents(orderTotal)) {
    return { ok: false as const, error: 'El pago supera el saldo disponible del pedido.' }
  }

  return { ok: true as const, amount }
}
