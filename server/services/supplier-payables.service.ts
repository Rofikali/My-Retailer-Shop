import type { Database } from '../db/client'
import { SupplierPayablesRepo } from '../repositories/supplier-payables.repo'

const toPaise = (value: number | string) => Math.round(Number(value) * 100)
export class SupplierPayablesService {
  private repo: SupplierPayablesRepo
  constructor(database: Database) { this.repo = new SupplierPayablesRepo(database) }
  status(purchase: { total: string; allocated: string; dueDate: string | null }) {
    const outstanding = toPaise(purchase.total) - toPaise(purchase.allocated)
    if (outstanding <= 0) return 'paid'
    if (toPaise(purchase.allocated) > 0) return 'partial'
    return purchase.dueDate && purchase.dueDate < new Date().toISOString().slice(0, 10) ? 'overdue' : 'pending'
  }
  async listOpenPurchases(supplierId: string) {
    const purchases = await this.repo.listCreditPurchases(supplierId)
    return purchases.map((purchase) => ({ ...purchase, total: Number(purchase.total), allocated: Number(purchase.allocated), outstanding: Number(purchase.total) - Number(purchase.allocated), status: this.status(purchase) })).filter((purchase) => purchase.outstanding > 0.004)
  }
  async allocatePayment(tx: Database, paymentEventId: string, supplierId: string, amount: number, allocations: { purchaseId: string; amount: number }[], userId: string) {
    if (!allocations.length) return []
    if (toPaise(allocations.reduce((total, allocation) => total + allocation.amount, 0)) !== toPaise(amount)) throw createError({ statusCode: 400, statusMessage: 'Allocated purchase amounts must equal the payment amount' })
    const purchases = await this.repo.getCreditPurchases(tx, supplierId, allocations.map((allocation) => allocation.purchaseId))
    if (purchases.length !== allocations.length) throw createError({ statusCode: 400, statusMessage: 'A payment can only settle this supplier’s credit purchases' })
    const byId = new Map(purchases.map((purchase) => [purchase.id, purchase]))
    for (const allocation of allocations) {
      const purchase = byId.get(allocation.purchaseId)
      if (!purchase || toPaise(allocation.amount) > toPaise(purchase.total) - toPaise(purchase.allocated)) throw createError({ statusCode: 400, statusMessage: 'Allocation exceeds the purchase outstanding balance' })
    }
    return this.repo.insertAllocations(tx, allocations.map((allocation) => ({ paymentEventId, purchaseId: allocation.purchaseId, amount: String(allocation.amount), createdBy: userId })))
  }
}
