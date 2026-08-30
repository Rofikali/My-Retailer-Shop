import type { Database } from '../db/client'
import { CustomerReceivablesRepo } from '../repositories/customer-receivables.repo'

export type ReceiptAllocation = { saleId: string; amount: number }
export type InvoiceSettlementStatus = 'paid' | 'partial' | 'pending' | 'overdue'

function toPaise(value: number | string) {
  return Math.round(Number(value) * 100)
}

export class CustomerReceivablesService {
  private repo: CustomerReceivablesRepo

  constructor(database: Database) {
    this.repo = new CustomerReceivablesRepo(database)
  }

  settlementStatus(invoice: { total: string; allocated: string; dueDate: string | null }): InvoiceSettlementStatus {
    const total = toPaise(invoice.total)
    const allocated = toPaise(invoice.allocated)
    if (allocated >= total) return 'paid'
    if (allocated > 0) return 'partial'
    const today = new Date().toISOString().slice(0, 10)
    return invoice.dueDate && invoice.dueDate < today ? 'overdue' : 'pending'
  }

  async listOpenInvoices(customerId: string) {
    const invoices = await this.repo.listCreditInvoices(customerId)
    return invoices
      .map((invoice) => {
        const total = Number(invoice.total)
        const allocated = Number(invoice.allocated)
        return { ...invoice, total, allocated, outstanding: total - allocated, status: this.settlementStatus(invoice) }
      })
      .filter((invoice) => invoice.outstanding > 0.004)
      .sort((left, right) => (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31') || left.saleDate.localeCompare(right.saleDate))
  }

  async getStatuses(invoiceIds: string[]) {
    const invoices = await this.repo.getCreditInvoicesByIds(invoiceIds)
    return new Map(invoices.map((invoice) => [invoice.id, this.settlementStatus(invoice)]))
  }

  async allocateReceipt(tx: Database, receiptEventId: string, customerId: string, receiptAmount: number, allocations: ReceiptAllocation[], userId: string) {
    if (!allocations.length) return []
    const allocatedTotal = allocations.reduce((total, allocation) => total + allocation.amount, 0)
    if (toPaise(allocatedTotal) !== toPaise(receiptAmount)) {
      throw createError({ statusCode: 400, statusMessage: 'Allocated invoice amounts must equal the receipt amount' })
    }

    const invoiceIds = allocations.map((allocation) => allocation.saleId)
    const invoices = await this.repo.getCreditInvoices(tx, customerId, invoiceIds)
    if (invoices.length !== invoiceIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'A receipt can only settle this customer’s credit-sale invoices' })
    }

    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]))
    for (const allocation of allocations) {
      const invoice = invoiceById.get(allocation.saleId)
      if (!invoice) throw createError({ statusCode: 400, statusMessage: 'Invoice was not found for this customer' })
      const outstanding = toPaise(invoice.total) - toPaise(invoice.allocated)
      if (toPaise(allocation.amount) > outstanding) {
        throw createError({ statusCode: 400, statusMessage: `Allocation exceeds outstanding balance for invoice ${invoice.invoiceNo}` })
      }
    }

    return this.repo.insertAllocations(tx, allocations.map((allocation) => ({
      receiptEventId,
      saleId: allocation.saleId,
      amount: String(allocation.amount),
      createdBy: userId
    })))
  }
}
