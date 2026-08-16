import { describe, it, expect } from 'vitest'
import { CashTxnInput } from '../../server/utils/validation/cashTxn'
import { SaleInput } from '../../server/utils/validation/sale'
import { PurchaseInput } from '../../server/utils/validation/purchase'
import { InventoryAdjustmentInput } from '../../server/utils/validation/inventoryAdjustment'
import { BusinessProfileInput } from '../../server/utils/validation/businessProfile'

describe('CashTxnInput', () => {
  it('rejects a transaction with both receipt and payment set', () => {
    const result = CashTxnInput.safeParse({
      txnDate: '2026-08-01', particulars: 'Test', category: 'expense',
      receipt: 100, payment: 50, paymentMode: 'Cash'
    })
    expect(result.success).toBe(false)
  })

  it('rejects a transaction with neither receipt nor payment set', () => {
    const result = CashTxnInput.safeParse({
      txnDate: '2026-08-01', particulars: 'Test', category: 'expense',
      receipt: 0, payment: 0, paymentMode: 'Cash'
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid receipt-only transaction', () => {
    const result = CashTxnInput.safeParse({
      txnDate: '2026-08-01', particulars: 'Test sale', category: 'sales',
      receipt: 100, payment: 0, paymentMode: 'Cash'
    })
    expect(result.success).toBe(true)
  })
})

describe('SaleInput', () => {
  const validItem = { productId: '00000000-0000-0000-0000-000000000001', quantity: 1, costPrice: 10, sellingPrice: 15 }

  it('rejects a credit sale with no customer - this is exactly the "reused customer ID" class of bug the Excel version had, caught at the validation layer before it ever reaches the ledger', () => {
    const result = SaleInput.safeParse({
      saleDate: '2026-08-01', paymentMode: 'credit', items: [validItem]
      // customerId deliberately omitted
    })
    expect(result.success).toBe(false)
  })

  it('accepts a cash sale with no customer (walk-in)', () => {
    const result = SaleInput.safeParse({
      saleDate: '2026-08-01', paymentMode: 'cash', items: [validItem]
    })
    expect(result.success).toBe(true)
  })

  it('rejects a sale with zero line items', () => {
    const result = SaleInput.safeParse({
      saleDate: '2026-08-01', paymentMode: 'cash', items: []
    })
    expect(result.success).toBe(false)
  })

  it('rejects a line item with zero or negative quantity', () => {
    const result = SaleInput.safeParse({
      saleDate: '2026-08-01', paymentMode: 'cash',
      items: [{ ...validItem, quantity: 0 }]
    })
    expect(result.success).toBe(false)
  })
})

describe('PurchaseInput', () => {
  it('requires a supplier even for a cash purchase (unlike sales, which allow walk-in)', () => {
    const result = PurchaseInput.safeParse({
      purchaseDate: '2026-08-01', paymentMode: 'cash',
      items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1, unitCost: 10 }]
      // supplierId deliberately omitted
    })
    expect(result.success).toBe(false)
  })
})

describe('InventoryAdjustmentInput', () => {
  it('rejects a zero-quantity adjustment (there is nothing to record)', () => {
    const result = InventoryAdjustmentInput.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      adjustmentDate: '2026-08-01', reason: 'correction', quantity: 0
    })
    expect(result.success).toBe(false)
  })

  it('accepts a negative quantity for a correction (stock count came in lower than recorded)', () => {
    const result = InventoryAdjustmentInput.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      adjustmentDate: '2026-08-01', reason: 'correction', quantity: -3
    })
    expect(result.success).toBe(true)
  })
})

describe('BusinessProfileInput', () => {
  const validProfile = {
    businessName: 'RetailShop', financialYearStart: '2026-04-01', financialYearEnd: '2027-03-31',
    gstRegistered: false, currency: 'INR', timezone: 'Asia/Kolkata', invoicePrefix: 'INV-',
    purchasePrefix: 'PUR-', defaultWarehouse: 'Main'
  }

  it('accepts a complete operational profile', () => {
    expect(BusinessProfileInput.safeParse({ ...validProfile, email: 'owner@example.com', city: 'Kolkata' }).success).toBe(true)
  })

  it('requires GSTIN when GST is enabled', () => {
    const result = BusinessProfileInput.safeParse({ ...validProfile, gstRegistered: true })
    expect(result.success).toBe(false)
  })

  it('rejects unsupported currencies and unsafe document prefixes', () => {
    expect(BusinessProfileInput.safeParse({ ...validProfile, currency: 'XYZ' }).success).toBe(false)
    expect(BusinessProfileInput.safeParse({ ...validProfile, invoicePrefix: 'INV/2026' }).success).toBe(false)
  })
})
