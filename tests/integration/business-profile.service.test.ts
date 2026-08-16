import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { businessProfile } from '../../server/db/schema'
import { BusinessProfileService } from '../../server/services/businessProfile.service'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'

describe('BusinessProfileService', () => {
  beforeAll(async () => {
    await setUpTestDb()
    await testDb.insert(businessProfile).values({
      businessName: 'Test RetailShop',
      financialYearStart: '2026-04-01',
      financialYearEnd: '2027-03-31',
      gstRegistered: false
    })
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('persists identity, locale, and document defaults as one profile update', async () => {
    const service = new BusinessProfileService(testDb)
    const updated = await service.update({
      businessName: 'Updated RetailShop',
      financialYearStart: '2026-04-01',
      financialYearEnd: '2027-03-31',
      gstRegistered: false,
      phone: '+91 9876543210',
      email: 'owner@example.com',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '700001',
      address: '1 Test Road',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      invoicePrefix: 'INV-',
      purchasePrefix: 'PUR-',
      defaultWarehouse: 'Main'
    })

    expect(updated?.businessName).toBe('Updated RetailShop')
    expect(updated?.email).toBe('owner@example.com')
    expect(updated?.invoicePrefix).toBe('INV-')
    expect(updated?.defaultWarehouse).toBe('Main')
  })
})
