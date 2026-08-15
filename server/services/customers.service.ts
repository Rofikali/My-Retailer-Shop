import { db, type Database } from '../db/client'
import { CustomersRepo } from '../repositories/customers.repo'
import { LedgerService } from './ledger.service'
import { PartyLedgerService } from './party-ledger.service'
import type { CustomerInputType } from '../utils/validation/customer'

export class CustomersService {
  private repo: CustomersRepo
  private ledger: LedgerService
  private partyLedger: PartyLedgerService

  constructor(private database: Database = db) {
    this.repo = new CustomersRepo(database)
    this.ledger = new LedgerService(database)
    this.partyLedger = new PartyLedgerService(database)
  }

  list(search?: string) {
    return this.repo.list(search)
  }

  async create(input: CustomerInputType, userId: string) {
    const code = await this.repo.nextCode()
    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database
      const customer = await this.repo.insert(dbTx, {
        code, name: input.name, company: input.company || null, phone: input.phone || null,
        email: input.email || null, gstin: input.gstin || null, address: input.address || null,
        city: input.city || null, state: input.state || null, pinCode: input.pinCode || null,
        openingBalance: String(input.openingBalance ?? 0),
        creditLimit: input.creditLimit !== undefined ? String(input.creditLimit) : null,
        status: input.status, remarks: input.remarks || null, assignedTo: userId
      })
      if (!customer) throw new Error('Customer was not created.')
      if ((input.openingBalance ?? 0) > 0) {
        await this.ledger.post(dbTx, [
          { accountCode: 'DEBTORS', debit: input.openingBalance, customerId: customer.id },
          { accountCode: 'CAPITAL', credit: input.openingBalance }
        ], { entryDate: new Date().toISOString().slice(0, 10), description: `Opening balance: ${customer.name}`, referenceType: 'opening_balance', referenceId: customer.id, createdBy: userId })
        await this.partyLedger.post(dbTx, {
          entryDate: new Date().toISOString().slice(0, 10), voucherNo: `OPEN-${customer.code}`, customerId: customer.id,
          particulars: `Opening balance: ${customer.name}`, debit: String(input.openingBalance), credit: '0',
          referenceType: 'opening_balance', referenceId: customer.id, status: 'posted', createdBy: userId, approvedBy: userId
        })
      }
      return customer
    })
  }

  async getWithBalance(id: string) {
    const customer = await this.repo.getById(id)
    if (!customer) return null
    const balance = await this.repo.getOutstandingBalance(id)
    const ledger = await this.repo.getLedger(id)
    return { ...customer, outstandingBalance: balance, ledger }
  }
}

export const customersService = new CustomersService()
