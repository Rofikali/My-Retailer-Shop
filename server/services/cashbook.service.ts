import { db, type Database } from '../db/client'
import { CashBookRepo } from '../repositories/cashbook.repo'
import { LedgerService } from './ledger.service'
import type { CashTxnInputType } from '../utils/validation/cashTxn'

// Maps a Cash Book category to the "other side" of the double entry. Cash itself is
// always the other leg. This is intentionally simple - a manual Cash Book entry is for
// quick, single-line transactions; anything that needs line-item detail (a multi-product
// sale, a multi-item purchase) should go through the Sales/Purchase modules instead,
// which post their own, more detailed ledger lines.
const CATEGORY_TO_ACCOUNT: Record<CashTxnInputType['category'], string> = {
  capital: 'CAPITAL',
  sales: 'SALES-REV',
  expense: 'EXP-OTHER',
  drawings: 'DRAWINGS',
  purchase: 'INVENTORY',
  other: 'EXP-OTHER'
}

export class CashBookService {
  private repo: CashBookRepo
  private ledger: LedgerService

  constructor(private database: Database) {
    this.repo = new CashBookRepo(database)
    this.ledger = new LedgerService(database)
  }

  async list(filters: { from?: string; to?: string; category?: string; page?: number; pageSize?: number }) {
    return this.repo.list({
      from: filters.from,
      to: filters.to,
      category: filters.category,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50
    })
  }

  async record(input: CashTxnInputType, userId: string) {
    const isReceipt = input.receipt > 0
    const amount = isReceipt ? input.receipt : input.payment
    const otherAccount = CATEGORY_TO_ACCOUNT[input.category]
    const voucherNo = await this.repo.nextVoucherNo()

    return this.database.transaction(async (tx) => {
      const cashTxnRow = await this.repo.insert(tx as unknown as Database, {
        txnDate: input.txnDate,
        voucherNo,
        particulars: input.particulars,
        category: input.category,
        receipt: String(input.receipt),
        payment: String(input.payment),
        paymentMode: input.paymentMode,
        referenceNo: input.referenceNo,
        remarks: input.remarks,
        createdBy: userId
      })

      await this.ledger.post(
        tx as unknown as Database,
        isReceipt
          ? [{ accountCode: 'CASH', debit: amount }, { accountCode: otherAccount, credit: amount }]
          : [{ accountCode: otherAccount, debit: amount }, { accountCode: 'CASH', credit: amount }],
        {
          entryDate: input.txnDate,
          description: input.particulars,
          referenceType: 'cash_txn',
          referenceId: cashTxnRow.id,
          createdBy: userId
        }
      )

      return cashTxnRow
    })
  }
}

export const cashBookService = new CashBookService(db)
