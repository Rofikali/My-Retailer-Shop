/**
 * Pure perpetual moving-weighted-average costing transitions.
 *
 * Quantities use the current database quantity scale (2 decimal places).
 * Carrying values use integer currency minor units (paise for INR).
 * BigInt keeps every calculation exact; this module performs no I/O and has
 * no dependency on browser input, Drizzle, PostgreSQL, or mutable product cost.
 *
 * The caller is responsible for calculating a purchase line's net acquisition
 * value in minor units under the approved purchase-discount policy.
 */

export interface MwacBalance {
  /** Quantity in decimal units, with at most 2 fractional digits (e.g. "10.25"). */
  quantity: string
  /** Total carrying value in integer currency minor units (e.g. "12345" = ₹123.45). */
  carryingValueMinorUnits: string
}

export interface MwacReceipt {
  /** Positive received quantity, with at most 2 fractional digits. */
  quantity: string
  /** Non-negative net acquisition value in integer currency minor units. */
  acquisitionValueMinorUnits: string
}

export interface MwacIssue {
  /** Positive issued quantity, with at most 2 fractional digits. */
  quantity: string
}

export interface MwacTransition {
  balance: MwacBalance
  /** Value removed from inventory for this issue, in integer currency minor units. */
  cogsMinorUnits?: string
}

const QUANTITY_SCALE = 100n

function parseQuantity(value: string, field: string): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new RangeError(`${field} must be a non-negative decimal with at most 2 fractional digits`)
  }

  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(2, '0'))
}

function formatQuantity(scaled: bigint): string {
  const whole = scaled / QUANTITY_SCALE
  const fraction = (scaled % QUANTITY_SCALE).toString().padStart(2, '0')
  return `${whole}.${fraction}`
}

function parseMinorUnits(value: string, field: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new RangeError(`${field} must be a non-negative integer string`)
  }
  return BigInt(value)
}

function parseBalance(balance: MwacBalance) {
  const quantity = parseQuantity(balance.quantity, 'Balance quantity')
  const carryingValue = parseMinorUnits(balance.carryingValueMinorUnits, 'Carrying value')

  if (quantity === 0n && carryingValue !== 0n) {
    throw new RangeError('A zero-quantity balance must have zero carrying value')
  }

  return { quantity, carryingValue }
}

/** Round a non-negative rational number to the nearest integer, ties upward. */
function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('Denominator must be positive')
  return (numerator + denominator / 2n) / denominator
}

/**
 * Add a receipt to the existing product/warehouse balance.
 * Acquisition value is already net of any approved line-level discount allocation.
 */
export function receiveMwac(
  current: MwacBalance,
  receipt: MwacReceipt
): MwacTransition {
  const balance = parseBalance(current)
  const receivedQuantity = parseQuantity(receipt.quantity, 'Receipt quantity')
  const acquisitionValue = parseMinorUnits(receipt.acquisitionValueMinorUnits, 'Acquisition value')

  if (receivedQuantity <= 0n) throw new RangeError('Receipt quantity must be greater than zero')

  const nextQuantity = balance.quantity + receivedQuantity
  const nextValue = balance.carryingValue + acquisitionValue

  return {
    balance: {
      quantity: formatQuantity(nextQuantity),
      carryingValueMinorUnits: nextValue.toString()
    }
  }
}

/**
 * Issue stock at the current moving weighted-average cost.
 *
 * Partial issues round COGS to the nearest minor unit, ties upward. A final
 * full depletion consumes the exact remaining carrying value, preventing a
 * residual paise balance after all units have been issued.
 */
export function issueMwac(
  current: MwacBalance,
  issue: MwacIssue
): MwacTransition {
  const balance = parseBalance(current)
  const issuedQuantity = parseQuantity(issue.quantity, 'Issue quantity')

  if (issuedQuantity <= 0n) throw new RangeError('Issue quantity must be greater than zero')
  if (issuedQuantity > balance.quantity) throw new RangeError('Insufficient stock for inventory issue')

  const cogs = issuedQuantity === balance.quantity
    ? balance.carryingValue
    : divideRoundHalfUp(issuedQuantity * balance.carryingValue, balance.quantity)

  const remainingQuantity = balance.quantity - issuedQuantity
  const remainingValue = balance.carryingValue - cogs

  return {
    balance: {
      quantity: formatQuantity(remainingQuantity),
      carryingValueMinorUnits: remainingValue.toString()
    },
    cogsMinorUnits: cogs.toString()
  }
}
