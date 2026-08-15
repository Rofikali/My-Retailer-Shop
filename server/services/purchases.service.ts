import { db, type Database } from '../db/client'
import { PurchasesRepo } from '../repositories/purchases.repo'
import { LedgerService } from './ledger.service'
import { InventoryService } from './inventory.service'
import { PartyLedgerService } from './party-ledger.service'
import type { PurchaseInputType } from '../utils/validation/purchase'

/**
 * Mirrors SalesService.recordSale() exactly - same Unit-of-Work shape (docs/04-LLD.md
 * §2), simpler ledger posting because a purchase has no revenue/COGS split, just an
 * inventory acquisition:
 *
 *   Debit INVENTORY totalAmount
 *   Credit CASH (paid now) or CREDITORS (on credit) totalAmount
 *
 * One transaction: purchase + purchase_items + ledger post + inventory receive, all
 * or nothing.
 */
export class PurchasesService {
  private repo: PurchasesRepo
  private ledger: LedgerService
  private inventory: InventoryService
  private partyLedger: PartyLedgerService

  constructor(private database: Database) {
    this.repo = new PurchasesRepo(database)
    this.ledger = new LedgerService(database)
    this.inventory = new InventoryService(database)
    this.partyLedger = new PartyLedgerService(database)
  }

  list() {
    return this.repo.list()
  }

  getById(id: string) {
    return this.repo.getById(id)
  }

  async recordPurchase(input: PurchaseInputType, userId: string) {
    const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost - (item.discount ?? 0), 0)
    const status = input.paymentMode === 'credit' ? 'pending' : 'paid'
    const purchaseNo = await this.repo.nextPurchaseNo()

    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database

      const purchase = await this.repo.insertPurchase(dbTx, {
        purchaseNo,
        purchaseDate: input.purchaseDate,
        supplierId: input.supplierId,
        paymentMode: input.paymentMode,
        status,
        warehouse: input.warehouse,
        referenceNo: input.referenceNo || null,
        remarks: input.remarks || null,
        createdBy: userId
      })

      await this.repo.insertItems(
        dbTx,
        input.items.map((item) => ({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: String(item.quantity),
          unitCost: String(item.unitCost),
          discount: String(item.discount ?? 0)
        }))
      )

      const creditAccount = input.paymentMode === 'credit' ? 'CREDITORS' : 'CASH'
      await this.ledger.post(
        dbTx,
        [
          { accountCode: 'INVENTORY', debit: totalAmount },
          {
            accountCode: creditAccount,
            credit: totalAmount,
            supplierId: input.paymentMode === 'credit' ? input.supplierId : undefined
          }
        ],
        {
          entryDate: input.purchaseDate,
          description: `Purchase ${purchaseNo}`,
          referenceType: 'purchase',
          referenceId: purchase.id,
          createdBy: userId
        }
      )

      await this.partyLedger.post(dbTx, {
        entryDate: input.purchaseDate, voucherNo: `PUR-${purchaseNo}`, purchaseNo, supplierId: input.supplierId,
        particulars: `Purchase ${purchaseNo}`, debit: String(input.paymentMode === 'credit' ? 0 : totalAmount), credit: String(totalAmount),
        paymentMode: input.paymentMode, referenceType: 'purchase', referenceId: purchase.id, referenceNo: input.referenceNo || null,
        status, salespersonId: userId, remarks: input.remarks || null, createdBy: userId, approvedBy: userId
      })

      await this.inventory.receive(
        dbTx,
        input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        { movementDate: input.purchaseDate, referenceType: 'purchase', referenceId: purchase.id, createdBy: userId, warehouse: input.warehouse, remarks: input.remarks }
      )

      return { ...purchase, totalAmount }
    })
  }
}

export const purchasesService = new PurchasesService(db)
