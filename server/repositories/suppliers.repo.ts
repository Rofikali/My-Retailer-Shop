import { and, eq, asc, desc, ilike, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { ledgerEntries, partyLedgerEvents, purchases, suppliers, users } from '../db/schema'
import { alias } from 'drizzle-orm/pg-core'

const enteredBy = alias(users, 'supplier_ledger_entered_by')
const buyer = alias(users, 'supplier_ledger_buyer')

export class SuppliersRepo {
  constructor(private db: Database) {}

  async list(search?: string) {
    return this.db
      .select({
        id: suppliers.id, code: suppliers.code, name: suppliers.name, company: suppliers.company,
        contactPerson: suppliers.contactPerson, phone: suppliers.phone, email: suppliers.email,
        gstin: suppliers.gstin, address: suppliers.address, city: suppliers.city, state: suppliers.state,
        pinCode: suppliers.pinCode, openingBalance: suppliers.openingBalance, creditTermsDays: suppliers.creditTermsDays,
        creditLimit: suppliers.creditLimit, supplierType: suppliers.supplierType, rating: suppliers.rating,
        status: suppliers.status, remarks: suppliers.remarks, createdAt: suppliers.createdAt,
        lastPurchase: sql<string | null>`(SELECT MAX(${purchases.purchaseDate}) FROM ${purchases} WHERE ${purchases.supplierId} = ${suppliers.id})`
      })
      .from(suppliers)
      .where(search ? ilike(suppliers.name, `%${search}%`) : undefined)
      .orderBy(asc(suppliers.name))
  }

  async getById(id: string) {
    const [row] = await this.db.select().from(suppliers).where(eq(suppliers.id, id))
    return row ?? null
  }

  async insert(tx: Database, values: typeof suppliers.$inferInsert) {
    const [row] = await tx.insert(suppliers).values(values).returning()
    return row
  }

  async nextCode(): Promise<string> {
    const [row] = await this.db.select().from(suppliers).orderBy(desc(suppliers.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.code.replace(/\D/g, ''), 10) || 0 : 0
    return `SUP-${String(lastNum + 1).padStart(4, '0')}`
  }

  /** Creditors are credit-normal, so outstanding = net Credit - Debit (opposite sign
   *  convention from Customers' Debit - Credit). Same "sum the whole ledger" approach -
   *  never a separately stored, driftable balance. */
  async getOutstandingBalance(supplierId: string): Promise<number> {
    const [row] = await this.db
      .select({
        net: sql<string>`COALESCE(SUM(${ledgerEntries.credit}) - SUM(${ledgerEntries.debit}), 0)`
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.supplierId, supplierId))
    return Number(row?.net ?? 0)
  }

  async getLedger(supplierId: string) {
    return this.db
      .select({
        id: partyLedgerEvents.id, entryDate: partyLedgerEvents.entryDate,
        voucherNo: partyLedgerEvents.voucherNo, purchaseNo: partyLedgerEvents.purchaseNo, particulars: partyLedgerEvents.particulars,
        debit: partyLedgerEvents.debit, credit: partyLedgerEvents.credit, paymentMode: partyLedgerEvents.paymentMode,
        referenceNo: partyLedgerEvents.referenceNo,
        dueDate: partyLedgerEvents.dueDate,
        status: partyLedgerEvents.status, buyerName: buyer.name,
        remarks: partyLedgerEvents.remarks, enteredByName: enteredBy.name, approvedByName: enteredBy.name, rating: suppliers.rating
      })
      .from(partyLedgerEvents)
      .leftJoin(suppliers, eq(partyLedgerEvents.supplierId, suppliers.id))
      .leftJoin(enteredBy, eq(partyLedgerEvents.createdBy, enteredBy.id))
      .leftJoin(buyer, eq(partyLedgerEvents.salespersonId, buyer.id))
      .where(eq(partyLedgerEvents.supplierId, supplierId))
      .orderBy(asc(partyLedgerEvents.entryDate), asc(partyLedgerEvents.createdAt))
  }
}
