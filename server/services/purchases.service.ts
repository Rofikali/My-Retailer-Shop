import { db, type Database } from '../db/client'
import { PurchasesRepo } from '../repositories/purchases.repo'
import { LedgerService } from './ledger.service'
import { InventoryService } from './inventory.service'
import { PartyLedgerService } from './party-ledger.service'
import { calculatePurchaseMoney } from '../domain/money/purchase'
import type { PurchaseInputType } from '../utils/validation/purchase'

/**
 * Purchase accounting remains one transaction. This milestone changes only the
 * monetary calculation: exact paise totals are shared by the purchase snapshot,
 * supplier subledger, and general ledger. Stock receipt still uses the legacy
 * quantity-only path until every stock writer can be coordinated safely.
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
    const money = calculatePurchaseMoney(input.items)
    const ledgerAmount = money.totalAmount
    const responseTotalAmount = Number(ledgerAmount)
    const status = input.paymentMode === 'credit' ? 'pending' : 'paid'
    const purchaseNo = await this.repo.nextPurchaseNo()

    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database
      // Purchase receipts participate in the same product-row lock protocol as
      // sales and manual adjustments, even though they do not consume stock.
      await this.inventory.lockStockForWrite(
        dbTx,
        input.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        input.warehouse ?? 'Main',
        'in'
      )


      const purchase = await this.repo.insertPurchase(dbTx, {
        purchaseNo,
        purchaseDate: input.purchaseDate,
        supplierId: input.supplierId,
        paymentMode: input.paymentMode,
        dueDate: input.dueDate || null,
        status,
        warehouse: input.warehouse,
        referenceNo: input.referenceNo || null,
        remarks: input.remarks || null,
        createdBy: userId
      })

      await this.repo.insertItems(
        dbTx,
        money.lines.map((line, index) => {
          const inputItem = input.items[index]
          if (!inputItem) {
            throw new Error(`Purchase line mapping invariant failed at index ${index}.`)
          }

          return {
            purchaseId: purchase.id,
            productId: inputItem.productId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            discount: line.discount
          }
        })
      )

      const creditAccount = input.paymentMode === 'credit' ? 'CREDITORS' : 'CASH'
      await this.ledger.post(
        dbTx,
        [
          { accountCode: 'INVENTORY', debit: ledgerAmount },
          {
            accountCode: creditAccount,
            credit: ledgerAmount,
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
        particulars: `Purchase ${purchaseNo}`,
        debit: input.paymentMode === 'credit' ? '0.00' : ledgerAmount,
        credit: ledgerAmount,
        paymentMode: input.paymentMode, referenceType: 'purchase', referenceId: purchase.id, referenceNo: input.referenceNo || null, dueDate: input.dueDate || null,
        status, salespersonId: userId, remarks: input.remarks || null, createdBy: userId, approvedBy: userId
      })

      await this.inventory.receive(
        dbTx,
        input.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        { movementDate: input.purchaseDate, referenceType: 'purchase', referenceId: purchase.id, createdBy: userId, warehouse: input.warehouse, remarks: input.remarks }
      )

      return { ...purchase, totalAmount: responseTotalAmount }
    })
  }
}

export const purchasesService = new PurchasesService(db)
