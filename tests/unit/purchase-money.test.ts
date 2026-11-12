import { describe, expect, it } from 'vitest'
import { calculatePurchaseMoney } from '../../server/domain/money/purchase'

describe('calculatePurchaseMoney', () => {
  it('calculates ordinary purchase totals and subtracts line discounts', () => {
    const result = calculatePurchaseMoney([
      { quantity: 10, unitCost: 20, discount: 25 },
      { quantity: 2, unitCost: 12.5 }
    ])

    expect(result.lines[0]).toMatchObject({
      grossMinorUnits: '20000',
      netAcquisitionMinorUnits: '17500'
    })
    expect(result.totalMinorUnits).toBe('20000')
    expect(result.totalAmount).toBe('200.00')
  })

  it('rounds each line to paise using half-up before discount', () => {
    const result = calculatePurchaseMoney([{ quantity: 0.1, unitCost: 0.25 }])

    expect(result.lines[0].grossMinorUnits).toBe('3')
    expect(result.totalAmount).toBe('0.03')
  })

  it('aggregates multiple line values using integer paise', () => {
    const result = calculatePurchaseMoney([
      { quantity: 0.1, unitCost: 0.25 },
      { quantity: 0.1, unitCost: 0.25 }
    ])

    expect(result.totalMinorUnits).toBe('6')
  })

  it('normalizes persisted quantity, unit cost, and discount decimals', () => {
    const result = calculatePurchaseMoney([{ quantity: 1, unitCost: 2, discount: 0.5 }])

    expect(result.lines[0]).toMatchObject({
      quantity: '1.00',
      unitCost: '2.00',
      discount: '0.50',
      netAcquisitionMinorUnits: '150'
    })
  })

  it('rejects discounts greater than the rounded gross line amount', () => {
    expect(() => calculatePurchaseMoney([
      { quantity: 0.1, unitCost: 0.25, discount: 0.04 }
    ])).toThrow(/discount cannot exceed/i)
  })

  it('rejects more than two decimal places instead of silently rounding source input', () => {
    expect(() => calculatePurchaseMoney([{ quantity: 1.001, unitCost: 2 }])).toThrow(/two decimal places/i)
  })

  it('rejects non-finite and negative values', () => {
    expect(() => calculatePurchaseMoney([{ quantity: 1, unitCost: Number.NaN }])).toThrow(/finite/i)
    expect(() => calculatePurchaseMoney([{ quantity: 1, unitCost: -1 }])).toThrow(/non-negative/i)
  })

  it('requires at least one line', () => {
    expect(() => calculatePurchaseMoney([])).toThrow(/at least one/i)
  })
})
