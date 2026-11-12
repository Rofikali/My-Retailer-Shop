/**
 * Exact purchase-line arithmetic for INR-style currency with two decimal places.
 *
 * Input values arrive as JSON numbers, so we first validate their shortest decimal
 * representation and convert them to scaled BigInts. Multiplication and aggregation
 * then happen without binary floating-point arithmetic.
 */

export interface PurchaseMoneyLineInput {
  quantity: number
  unitCost: number
  discount?: number
}

export interface PurchaseMoneyLine {
  quantity: string
  unitCost: string
  discount: string
  grossMinorUnits: string
  netAcquisitionMinorUnits: string
}

export interface PurchaseMoneyTotals {
  lines: PurchaseMoneyLine[]
  totalMinorUnits: string
  totalAmount: string
}

function decimalToScaledInteger(value: number, field: string): bigint {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite, non-negative number.`)
  }

  const text = value.toString()
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(text)
  if (!match) {
    throw new RangeError(`${field} must have no more than two decimal places.`)
  }

  const whole = BigInt(match[1])
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0'))
  return whole * 100n + fraction
}

function formatScaledInteger(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`
}

function formatMinorUnits(value: bigint): string {
  return formatScaledInteger(value)
}

/**
 * Round quantity × unit cost to the nearest paise, ties upward.
 * Both operands are scaled by 100, so their product divided by 100
 * gives paise. Adding 50 implements half-up rounding.
 */
function grossLineMinorUnits(quantityScaled: bigint, unitCostScaled: bigint): bigint {
  return (quantityScaled * unitCostScaled + 50n) / 100n
}

export function calculatePurchaseMoney(lines: PurchaseMoneyLineInput[]): PurchaseMoneyTotals {
  if (lines.length === 0) throw new RangeError('At least one purchase line is required.')

  let totalMinorUnits = 0n
  const calculatedLines = lines.map((line, index): PurchaseMoneyLine => {
    const quantity = decimalToScaledInteger(line.quantity, `Line ${index + 1} quantity`)
    const unitCost = decimalToScaledInteger(line.unitCost, `Line ${index + 1} unit cost`)
    const discount = decimalToScaledInteger(line.discount ?? 0, `Line ${index + 1} discount`)

    if (quantity <= 0n) throw new RangeError(`Line ${index + 1} quantity must be greater than zero.`)

    const gross = grossLineMinorUnits(quantity, unitCost)
    const discountMinorUnits = discount
    if (discountMinorUnits > gross) {
      throw new RangeError(`Line ${index + 1} discount cannot exceed its rounded gross amount.`)
    }

    const net = gross - discountMinorUnits
    totalMinorUnits += net

    return {
      quantity: formatScaledInteger(quantity),
      unitCost: formatScaledInteger(unitCost),
      discount: formatMinorUnits(discountMinorUnits),
      grossMinorUnits: gross.toString(),
      netAcquisitionMinorUnits: net.toString()
    }
  })

  return {
    lines: calculatedLines,
    totalMinorUnits: totalMinorUnits.toString(),
    totalAmount: formatMinorUnits(totalMinorUnits)
  }
}
