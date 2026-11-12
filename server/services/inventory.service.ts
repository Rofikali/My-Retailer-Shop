import { db, type Database } from '../db/client'
import { inventoryMovements, products } from '../db/schema'
import { eq } from 'drizzle-orm'
import { lockInventoryScopes } from './inventory-write-lock.service'
import { InventoryRepo } from '../repositories/inventory.repo'
import { LedgerService } from './ledger.service'
import type { InventoryAdjustmentInputType } from '../utils/validation/inventoryAdjustment'

export interface StockLine {
  productId: string
  quantity: number
}

function quantityToScaled(value: number, field: string): bigint {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be a finite, positive quantity.`)
  }
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.toString())
  if (!match) throw new RangeError(`${field} must have at most two decimal places.`)
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'))
}

function storedQuantityToScaled(value: string): bigint {
  const match = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) throw new RangeError('Stored inventory quantity has an invalid decimal representation.')
  const scaled = BigInt(match[2]!) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] === '-' ? -scaled : scaled
}

/**
 * Mirrors LedgerService's append-only pattern: inventory_movements is insert-only,
 * current stock = SUM(quantity) per product, never a stored "closing stock" column
 * that can drift. deduct()/receive() are called from inside the CALLER's
 * db.transaction() (SalesService, PurchaseService) - they never commit their own
 * transaction. adjustStock() is the exception - it's a top-level entry point (called
 * directly from the API route) because a manual adjustment is its own atomic unit of
 * work, not a step inside a larger one.
 */
export class InventoryService {
  private repo: InventoryRepo
  private ledger: LedgerService

  constructor(private database: Database = db) {
    this.repo = new InventoryRepo(database)
    this.ledger = new LedgerService(database)
  }

  async listWithStock() {
    const rows = await this.repo.listWithStock()
    return rows.map((r) => {
      const currentStock = Number(r.currentStock)
      const reorderLevel = Number(r.reorderLevel)
      const costPrice = Number(r.costPrice ?? 0)
      return {
        ...r,
        openingStock: Number(r.openingStock),
        stockIn: Number(r.stockIn),
        stockOut: Number(r.stockOut),
        damaged: Number(r.damaged),
        currentStock,
        stockValue: currentStock * costPrice,
        status: currentStock <= reorderLevel ? 'Reorder' : 'In Stock'
      }
    })
  }

  async getMovements(productId: string) {
    return this.repo.getMovements(productId)
  }

  async deduct(tx: Database, lines: StockLine[], opts: { movementDate: string; referenceType: string; referenceId: string; createdBy: string; warehouse?: string; remarks?: string }) {
    if (lines.length === 0) return []
    const warehouse = opts.warehouse ?? 'Main'
    const requestedByProduct = new Map<string, bigint>()

    for (const line of lines) {
      const requested = quantityToScaled(line.quantity, 'Sale quantity')
      requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0n) + requested)
    }

    const scopes = [...requestedByProduct.keys()].map((productId) => ({ productId, warehouse }))
    await lockInventoryScopes(tx, scopes)

    // The stock read happens only after the shared product/warehouse lock is held.
    // This serializes legacy sale writes with purchases, adjustments, and MWAC writes.
    for (const [productId, requested] of requestedByProduct) {
      const available = storedQuantityToScaled(await this.repo.getCurrentStockForWarehouse(tx, productId, warehouse))
      if (available < requested) {
        throw new Error(`Insufficient stock for product ${productId} in warehouse ${warehouse}.`)
      }
    }

    return tx.insert(inventoryMovements).values(
      lines.map((l) => ({
        productId: l.productId,
        movementDate: opts.movementDate,
        type: 'sale' as const,
        quantity: String(-Math.abs(l.quantity)),
        warehouse,
        remarks: opts.remarks,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
        createdBy: opts.createdBy
      }))
    ).returning()
  }

  async receive(tx: Database, lines: StockLine[], opts: { movementDate: string; referenceType: string; referenceId: string; createdBy: string; warehouse?: string; remarks?: string }) {
    if (lines.length === 0) return []
    const warehouse = opts.warehouse ?? 'Main'
    await lockInventoryScopes(tx, lines.map((line) => ({ productId: line.productId, warehouse })))
    return tx.insert(inventoryMovements).values(
      lines.map((l) => ({
        productId: l.productId,
        movementDate: opts.movementDate,
        type: 'purchase' as const,
        quantity: String(Math.abs(l.quantity)),
        warehouse,
        remarks: opts.remarks,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
        createdBy: opts.createdBy
      }))
    ).returning()
  }

  /**
   * Manual stock adjustment - the one place in the app where a stock change and a
   * ledger entry are DELIBERATELY decoupled for one reason type ('correction'), and
   * DELIBERATELY coupled for the other two:
   *
   *   - 'opening'    : you're recording pre-existing stock the business already had.
   *                    Debit INVENTORY / Credit CAPITAL - it's real value, funded by
   *                    the owner's investment, same as the initial cash capital entry.
   *   - 'damage'     : stock is gone and it's a real financial loss.
   *                    Debit EXP-LOSS / Credit INVENTORY.
   *   - 'correction' : a plain count correction (you counted and the number was
   *                    wrong) - NOT posted to the ledger, because a correction doesn't
   *                    represent a financial event, it represents fixing a data-entry
   *                    mistake. If a "correction" is actually disguising a real gain
   *                    or loss you haven't classified yet, that's a Journal entry to
   *                    make explicitly (see server/api - Journal is scaffolded but not
   *                    built), not something this method should guess at.
   */
  async adjustStock(input: InventoryAdjustmentInputType, userId: string) {
    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database
      const warehouse = input.warehouse ?? 'Main'
      await lockInventoryScopes(dbTx, [{ productId: input.productId, warehouse }])

      const [product] = await dbTx.select().from(products).where(eq(products.id, input.productId))
      if (!product) throw new Error('Product not found')
      const costPrice = Number(product.costPrice ?? 0)

      let movementQuantity: number
      let movementType: 'opening' | 'damage' | 'adjustment'

      if (input.reason === 'opening') {
        movementQuantity = Math.abs(input.quantity)
        movementType = 'opening'
      } else if (input.reason === 'damage') {
        movementQuantity = -Math.abs(input.quantity)
        movementType = 'damage'
      } else {
        movementQuantity = input.quantity // correction: sign as given
        movementType = 'adjustment'
      }

      const movement = await this.repo.insertMovement(dbTx, {
        productId: input.productId,
        movementDate: input.adjustmentDate,
        type: movementType,
        quantity: String(movementQuantity),
        warehouse,
        remarks: input.remarks || null,
        referenceType: 'manual',
        createdBy: userId
      })

      if (input.reason === 'opening' && costPrice > 0) {
        const value = Math.abs(input.quantity) * costPrice
        await this.ledger.post(
          dbTx,
          [{ accountCode: 'INVENTORY', debit: value }, { accountCode: 'CAPITAL', credit: value }],
          { entryDate: input.adjustmentDate, description: `Opening stock: ${product.name}`, referenceType: 'opening_balance', referenceId: movement.id, createdBy: userId }
        )
      } else if (input.reason === 'damage' && costPrice > 0) {
        const value = Math.abs(input.quantity) * costPrice
        await this.ledger.post(
          dbTx,
          [{ accountCode: 'EXP-LOSS', debit: value }, { accountCode: 'INVENTORY', credit: value }],
          { entryDate: input.adjustmentDate, description: `Damage: ${product.name}${input.remarks ? ' - ' + input.remarks : ''}`, referenceType: 'journal', referenceId: movement.id, createdBy: userId }
        )
      }
      // 'correction' intentionally posts no ledger entry - see method comment above.

      return movement
    })
  }
}

export const inventoryService = new InventoryService()
