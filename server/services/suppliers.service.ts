import { db } from '../db/client'
import { SuppliersRepo } from '../repositories/suppliers.repo'
import type { SupplierInputType } from '../utils/validation/supplier'

export class SuppliersService {
  private repo: SuppliersRepo

  constructor(database = db) {
    this.repo = new SuppliersRepo(database)
  }

  list(search?: string) {
    return this.repo.list(search)
  }

  async create(input: SupplierInputType) {
    const code = await this.repo.nextCode()
    return this.repo.insert({
      code,
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      address: input.address,
      openingBalance: '0',
      creditTermsDays: input.creditTermsDays !== undefined ? String(input.creditTermsDays) : undefined
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
