import type { Database } from '../db/client'
import { PartyLedgerRepo } from '../repositories/party-ledger.repo'
import { randomUUID } from 'node:crypto'

export class PartyLedgerService {
  private repo: PartyLedgerRepo

  constructor(database: Database) {
    this.repo = new PartyLedgerRepo(database)
  }

  post(tx: Database, input: typeof import('../db/schema').partyLedgerEvents.$inferInsert) {
    return this.repo.insert(tx, input)
  }

  async reverseOpeningBalance(tx: Database, originalReferenceId: string, entryDate: string, reason: string, userId: string) {
    const originals = await this.repo.getOpeningEntriesForReference(tx, originalReferenceId)
    const reversalReferenceId = randomUUID()

    for (const original of originals) {
      await this.repo.insert(tx, {
        entryDate,
        voucherNo: `${original.voucherNo}-REV`,
        invoiceNo: original.invoiceNo,
        purchaseNo: original.purchaseNo,
        customerId: original.customerId,
        supplierId: original.supplierId,
        particulars: `Reversal: ${reason}`,
        debit: original.credit,
        credit: original.debit,
        paymentMode: original.paymentMode,
        referenceType: 'reversal',
        referenceId: reversalReferenceId,
        referenceNo: original.referenceNo,
        dueDate: original.dueDate,
        status: 'reversed',
        salespersonId: original.salespersonId,
        remarks: original.remarks,
        createdBy: userId,
        approvedBy: userId,
        reversesEntryId: original.id
      })
    }
  }
}
