import { db, type Database } from '../db/client'
import { SuppliersRepo } from '../repositories/suppliers.repo'
import { LedgerService } from './ledger.service'
import { PartyLedgerService } from './party-ledger.service'
import type { SupplierInputType } from '../utils/validation/supplier'

export class SuppliersService {
  private repo: SuppliersRepo
  private ledger: LedgerService
  private partyLedger: PartyLedgerService

  constructor(private database: Database = db) {
    this.repo = new SuppliersRepo(database)
    this.ledger = new LedgerService(database)
    this.partyLedger = new PartyLedgerService(database)
  }

  list(search?: string) {
    return this.repo.list(search)
  }

  async create(input: SupplierInputType, userId: string) {
    const code = await this.repo.nextCode()
    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database
      const supplier = await this.repo.insert(dbTx, {
        code, name: input.name, company: input.company || null, contactPerson: input.contactPerson || null,
        phone: input.phone || null, email: input.email || null, gstin: input.gstin || null, address: input.address || null,
        city: input.city || null, state: input.state || null, pinCode: input.pinCode || null,
        openingBalance: String(input.openingBalance ?? 0), creditTermsDays: input.creditTermsDays !== undefined ? String(input.creditTermsDays) : null,
        creditLimit: input.creditLimit !== undefined ? String(input.creditLimit) : null, supplierType: input.supplierType,
        rating: input.rating !== undefined ? String(input.rating) : null, status: input.status, remarks: input.remarks || null
      })
      if (!supplier) throw new Error('Supplier was not created.')
      if ((input.openingBalance ?? 0) > 0) {
        await this.ledger.post(dbTx, [{ accountCode: 'CAPITAL', debit: input.openingBalance }, { accountCode: 'CREDITORS', credit: input.openingBalance, supplierId: supplier.id }],
          { entryDate: new Date().toISOString().slice(0, 10), description: `Opening balance: ${supplier.name}`, referenceType: 'opening_balance', referenceId: supplier.id, createdBy: userId })
        await this.partyLedger.post(dbTx, {
          entryDate: new Date().toISOString().slice(0, 10), voucherNo: `OPEN-${supplier.code}`, supplierId: supplier.id,
          particulars: `Opening balance: ${supplier.name}`, debit: '0', credit: String(input.openingBalance),
          referenceType: 'opening_balance', referenceId: supplier.id, status: 'posted', createdBy: userId, approvedBy: userId
        })
      }
      return supplier
    })
  }

  async getWithBalance(id: string) {
    const supplier = await this.repo.getById(id)
    if (!supplier) return null
    const balance = await this.repo.getOutstandingBalance(id)
    const ledger = await this.repo.getLedger(id)
    return { ...supplier, outstandingBalance: balance, ledger }
  }
}

export const suppliersService = new SuppliersService()
