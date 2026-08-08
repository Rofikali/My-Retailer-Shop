import { db } from '../db/client'
import { CustomersRepo } from '../repositories/customers.repo'
import type { CustomerInputType } from '../utils/validation/customer'

export class CustomersService {
  private repo: CustomersRepo

  constructor(database = db) {
    this.repo = new CustomersRepo(database)
  }

  list(search?: string) {
    return this.repo.list(search)
  }

  async create(input: CustomerInputType) {
    const code = await this.repo.nextCode()
    return this.repo.insert({
      code,
      name: input.name,
      phone: input.phone,
      email: input.email || undefined,
      address: input.address,
      creditLimit: input.creditLimit !== undefined ? String(input.creditLimit) : undefined
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
