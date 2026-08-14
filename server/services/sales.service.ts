import { db, type Database } from '../db/client'
import { SalesRepo } from '../repositories/sales.repo'
import { LedgerService } from './ledger.service'
import { InventoryService } from './inventory.service'
import type { SaleInputType } from '../utils/validation/sale'

/**
 * This is the reference Unit-of-Work implementation described in docs/04-LLD.md §2
 * ("Key Sequence: Record a Credit Sale"). Everything below runs inside ONE
 * db.transaction() - the sale, its line items, the ledger postings, and the inventory
 * deduction either all succeed together or none of them happen. This is the direct,
 * structural fix for the Sales-Register-vs-Cash-Book mismatch from the old spreadsheet:
 * it is not possible for a sale to exist without its ledger entries, or vice versa.
 */
export class SalesService {
  private repo: SalesRepo
  private ledger: LedgerService
  private inventory: InventoryService

  constructor(private database: Database) {
    this.repo = new SalesRepo(database)
    this.ledger = new LedgerService(database)
    this.inventory = new InventoryService()
  }

  list() {
    return this.repo.list()
  }

  getById(id: string) {
    return this.repo.getById(id)
  }

  async recordSale(input: SaleInputType, userId: string) {
    const totalSale = input.items.reduce((sum, item) => sum + item.quantity * item.sellingPrice - (item.discount ?? 0), 0)
    const totalCost = input.items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0)
    const status = input.paymentMode === 'credit' ? 'pending' : 'paid'
    const invoiceNo = await this.repo.nextInvoiceNo()

    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database

      // 1. The sale document itself
      const sale = await this.repo.insertSale(dbTx, {
        invoiceNo,
        saleDate: input.saleDate,
        customerId: input.customerId,
        paymentMode: input.paymentMode,
        status,
        referenceNo: input.referenceNo || null,
        remarks: input.remarks || null,
        createdBy: userId
      })

      // 2. Line items - cost/selling price stored as a SNAPSHOT (see docs/03-Database-
      //    Schema-ERD.md §4) so a later price change never rewrites this sale's history.
      await this.repo.insertItems(
        dbTx,
        input.items.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          quantity: String(item.quantity),
          costPrice: String(item.costPrice),
          sellingPrice: String(item.sellingPrice),
          discount: String(item.discount ?? 0)
        }))
      )

      // 3. Ledger postings - one balanced set covering both legs:
      //      revenue leg:  Debit Cash/Debtors, Credit Sales Revenue     (= totalSale)
      //      cost leg:     Debit COGS, Credit Inventory                (= totalCost)
      //    LedgerService.post() checks sum(debit) == sum(credit) across ALL four lines
      //    together, which holds here because totalSale balances totalSale and
      //    totalCost balances totalCost.
      const debitAccount = input.paymentMode === 'credit' ? 'DEBTORS' : 'CASH'
      await this.ledger.post(
        dbTx,
        [
          {
            accountCode: debitAccount,
            debit: totalSale,
            customerId: input.paymentMode === 'credit' ? input.customerId : undefined
          },
          { accountCode: 'SALES-REV', credit: totalSale },
          { accountCode: 'COGS', debit: totalCost },
          { accountCode: 'INVENTORY', credit: totalCost }
        ],
        {
          entryDate: input.saleDate,
          description: `Sale ${invoiceNo}`,
          referenceType: 'sale',
          referenceId: sale.id,
          createdBy: userId
        }
      )

      // 4. Inventory deduction - one movement row per line item, never a direct
      //    UPDATE to a "current stock" column.
      await this.inventory.deduct(
        dbTx,
        input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        { movementDate: input.saleDate, referenceType: 'sale', referenceId: sale.id, createdBy: userId }
      )

      return { ...sale, totalSale, totalCost, grossProfit: totalSale - totalCost }
    })
  }
}

export const salesService = new SalesService(db)
