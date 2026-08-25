import type { Database } from '../db/client'
import { PartyLedgerRepo } from '../repositories/party-ledger.repo'
import { randomUUID } from 'node:crypto'
import type { PartyLedgerAmendmentInputType } from '../utils/validation/partyLedgerAmendment'

export class PartyLedgerService {
  private repo: PartyLedgerRepo

  constructor(database: Database) {
    this.repo = new PartyLedgerRepo(database)
  }

  post(tx: Database, input: typeof import('../db/schema').partyLedgerEvents.$inferInsert) {
    return this.repo.insert(tx, input)
  }

  async amendMetadata(tx: Database, entryId: string, input: PartyLedgerAmendmentInputType, userId: string) {
    const entry = await this.repo.findById(entryId)
    if (!entry) throw createError({ statusCode: 404, statusMessage: 'Ledger entry not found' })
    if (entry.status !== 'posted') {
      throw createError({ statusCode: 400, statusMessage: 'Only posted ledger metadata can be amended' })
    }
    return this.repo.insertAmendment(tx, {
      partyLedgerEventId: entry.id,
      particulars: input.particulars,
      paymentMode: input.paymentMode,
      referenceNo: input.referenceNo,
      dueDate: input.dueDate,
      remarks: input.remarks,
      reason: input.reason,
      amendedBy: userId
    })
  }

  getLatestAmendments(entryIds: string[]) {
    return this.repo.getLatestAmendments(entryIds)
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
