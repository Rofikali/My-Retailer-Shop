import type { Database } from '../db/client'
import { LedgerRepo, type PostLine, type PostOptions } from '../repositories/ledger.repo'
import { randomUUID } from 'node:crypto'

function decimalToMinorUnits(value: string): bigint {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) throw new RangeError('Exact ledger amounts must be non-negative decimals with at most two places.')
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'))
}

/**
 * LedgerService is the ONLY code path in the entire application allowed to write to
 * ledger_entries. Every service that records money movement (SalesService,
 * PurchaseService, ExpenseService, CashBookService) calls this from inside its own
 * db.transaction(), never writes ledger rows itself.
 */
export class LedgerService {
  private repo: LedgerRepo

  constructor(db: Database) {
    this.repo = new LedgerRepo(db)
  }

  async post(tx: Database, lines: PostLine[], opts: PostOptions) {
    if (lines.length === 0) {
      throw new Error('Cannot post an empty set of ledger lines.')
    }

    const amounts = lines.flatMap((line) => [line.debit, line.credit].filter((value) => value !== undefined))
    const exactStringAmounts = amounts.every((value) => typeof value === 'string')

    if (exactStringAmounts) {
      const totalDebit = lines.reduce((sum, line) => sum + decimalToMinorUnits(String(line.debit ?? '0')), 0n)
      const totalCredit = lines.reduce((sum, line) => sum + decimalToMinorUnits(String(line.credit ?? '0')), 0n)
      if (totalDebit !== totalCredit) {
        throw new Error(`Unbalanced exact ledger posting rejected: debit ${totalDebit} paise != credit ${totalCredit} paise.`)
      }
    } else {
      // Compatibility path for existing callers. Migrate each financial workflow
      // to exact string amounts in focused changes rather than silently changing
      // unrelated posting semantics in this milestone.
      const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0)
      const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0)
      if (Math.abs(totalDebit - totalCredit) > 0.005) {
        throw new Error(
          `Unbalanced ledger posting rejected: total debit ${totalDebit} != total credit ${totalCredit}. ` +
          'This is a bug in the calling service, not a data-entry issue - fix the posting logic.'
        )
      }
    }

    return this.repo.insertLines(tx, lines, opts)
  }

  /** Reverse a previously posted set of ledger lines by inserting the mirror-image lines. */
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
