import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { ledgerEntries, suppliers } from '../../server/db/schema'
import { SuppliersService } from '../../server/services/suppliers.service'

describe('SuppliersService.create', () => {
  let userId: string
  let suppliersService: SuppliersService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    suppliersService = new SuppliersService(testDb)
  })

  afterAll(async () => { await closeTestDb() })

  it('creates the supplier master and opening creditor entry atomically', async () => {
    const supplier = await suppliersService.create(
      { name: 'Dadu Wholesale', company: 'Dadu Pvt Ltd', openingBalance: 800, creditTermsDays: 30, creditLimit: 5_000, supplierType: 'wholesaler', rating: 4.5, status: 'active' },
      userId
    )
    const [stored] = await testDb.select().from(suppliers).where(eq(suppliers.id, supplier.id))
    expect(stored).toMatchObject({ company: 'Dadu Pvt Ltd', openingBalance: '800.00', supplierType: 'wholesaler' })
    const entries = await testDb.select().from(ledgerEntries).where(eq(ledgerEntries.supplierId, supplier.id))
    expect(entries).toHaveLength(1)
    expect(Number(entries[0].credit)).toBe(800)
    const detail = await suppliersService.getWithBalance(supplier.id)
    expect(detail?.ledger[0]).toMatchObject({ status: 'posted', rating: '4.5' })
  })
})
