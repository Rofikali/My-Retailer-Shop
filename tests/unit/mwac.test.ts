import { describe, expect, it } from 'vitest'
import { issueMwac, receiveMwac, type MwacBalance } from '../../server/domain/inventory/mwac'

describe('pure MWAC costing transitions', () => {
  it('calculates the weighted average after multiple receipts', () => {
    const first = receiveMwac(
      { quantity: '0.00', carryingValueMinorUnits: '0' },
      { quantity: '10.00', acquisitionValueMinorUnits: '10000' }
    )
    const second = receiveMwac(first.balance, {
      quantity: '10.00',
      acquisitionValueMinorUnits: '14000'
    })

    expect(second.balance).toEqual({
      quantity: '20.00',
      carryingValueMinorUnits: '24000'
    })
  })

  it('issues stock at the current weighted average and preserves remaining value', () => {
    const balance: MwacBalance = { quantity: '20.00', carryingValueMinorUnits: '24000' }

    expect(issueMwac(balance, { quantity: '5.00' })).toEqual({
      balance: { quantity: '15.00', carryingValueMinorUnits: '18000' },
      cogsMinorUnits: '6000'
    })
  })

  it('supports fractional quantities exactly at the configured two-decimal scale', () => {
    const result = issueMwac(
      { quantity: '1.00', carryingValueMinorUnits: '1200' },
      { quantity: '0.01' }
    )

    expect(result).toEqual({
      balance: { quantity: '0.99', carryingValueMinorUnits: '1188' },
      cogsMinorUnits: '12'
    })
  })

  it('rounds partial issue COGS half up and assigns the final residual on depletion', () => {
    const opening = { quantity: '3.00', carryingValueMinorUnits: '100' }
    const first = issueMwac(opening, { quantity: '1.00' })
    const second = issueMwac(first.balance, { quantity: '1.00' })
    const final = issueMwac(second.balance, { quantity: '1.00' })

    expect(first.cogsMinorUnits).toBe('33')
    expect(second.cogsMinorUnits).toBe('34')
    expect(final.cogsMinorUnits).toBe('33')
    expect(final.balance).toEqual({ quantity: '0.00', carryingValueMinorUnits: '0' })
  })

  it('rejects an issue larger than available stock', () => {
    expect(() => issueMwac(
      { quantity: '2.00', carryingValueMinorUnits: '500' },
      { quantity: '2.01' }
    )).toThrow(/Insufficient stock/)
  })

  it('rejects zero and malformed receipt or issue quantities', () => {
    const empty = { quantity: '0.00', carryingValueMinorUnits: '0' }

    expect(() => receiveMwac(empty, { quantity: '0.00', acquisitionValueMinorUnits: '0' }))
      .toThrow(/greater than zero/)
    expect(() => issueMwac({ quantity: '1.00', carryingValueMinorUnits: '100' }, { quantity: '1.001' }))
      .toThrow(/at most 2 fractional digits/)
  })

  it('rejects inconsistent zero-quantity balances', () => {
    expect(() => receiveMwac(
      { quantity: '0.00', carryingValueMinorUnits: '1' },
      { quantity: '1.00', acquisitionValueMinorUnits: '100' }
    )).toThrow(/zero-quantity balance/)
  })

  it('does not mutate the input balance', () => {
    const balance: MwacBalance = { quantity: '10.00', carryingValueMinorUnits: '1000' }
    const snapshot = { ...balance }

    receiveMwac(balance, { quantity: '5.00', acquisitionValueMinorUnits: '600' })

    expect(balance).toEqual(snapshot)
  })
})
