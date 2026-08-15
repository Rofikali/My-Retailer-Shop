import type { Database } from '../db/client'
import { LedgerRepo, type PostLine, type PostOptions } from '../repositories/ledger.repo'
import { randomUUID } from 'node:crypto'

/**
 * LedgerService is the ONLY code path in the entire application allowed to write to
 * ledger_entries. Every service that records money movement (SalesService,
 * PurchaseService, ExpenseService, CashBookService) calls this from inside its own
 * db.transaction(), never writes ledger rows itself.
 *
 * This is the direct structural fix for the Excel reconciliation problem: it is not
 * possible to post an unbalanced entry, and it is not possible for a report to
 * disagree with the transactions that produced it, because reports read from exactly
 * this table.
 */
export class LedgerService {
  private repo: LedgerRepo

  constructor(db: Database) {
    this.repo = new LedgerRepo(db)
  }

  async post(tx: Database, lines: PostLine[], opts: PostOptions) {
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0)
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0)

    // Rounding-safe comparison - money is decimal, never compare floats for exact equality
    // without a tolerance.
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new Error(
        `Unbalanced ledger posting rejected: total debit ${totalDebit} != total credit ${totalCredit}. ` +
        `This is a bug in the calling service, not a data-entry issue - fix the posting logic.`
      )
    }
    if (lines.length === 0) {
      throw new Error('Cannot post an empty set of ledger lines.')
    }

    return this.repo.insertLines(tx, lines, opts)
  }

  /** Reverse a previously posted set of entries by inserting the mirror-image lines.
   *  Never call UPDATE/DELETE against ledger_entries directly - always reverse. */
  async reverse(tx: Database, originalReferenceId: string, opts: Omit<PostOptions, 'referenceId' | 'referenceType'>) {
    const originalEntries = await this.repo.getEntriesForReference(tx, originalReferenceId)
    if (originalEntries.length === 0) throw new Error('No ledger entries found for this reference.')
    if (await this.repo.hasReversalForReference(tx, originalReferenceId)) throw new Error('This posting has already been reversed.')
    if (!originalEntries.every((entry) => entry.referenceType === 'opening_balance')) {
      throw new Error('Operational documents require their domain-specific reversal workflow; direct ledger reversal is blocked.')
    }

    const reversalReferenceId = randomUUID()
    const lines: PostLine[] = originalEntries.map((entry) => ({
      accountCode: entry.accountCode,
      debit: Number(entry.credit),
      credit: Number(entry.debit),
      customerId: entry.customerId ?? undefined,
      supplierId: entry.supplierId ?? undefined,
      reversesEntryId: entry.id
    }))
    return this.post(tx, lines, { ...opts, referenceType: 'reversal', referenceId: reversalReferenceId })
  }

  balanceOf(codes: string[], asOfDate?: string) {
    return this.repo.getBalanceByAccountCodes(codes, asOfDate)
  }

  balanceBefore(codes: string[], beforeDate: string) {
    return this.repo.getBalanceBeforeAccountCodes(codes, beforeDate)
  }

  balancesByType(type: string, from?: string, to?: string) {
    return this.repo.getBalancesByType(type, from, to)
  }
}
