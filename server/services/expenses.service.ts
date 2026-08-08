import { db, type Database } from '../db/client'
import { ExpensesRepo } from '../repositories/expenses.repo'
import { LedgerService } from './ledger.service'
import type { ExpenseInputType } from '../utils/validation/expense'

// Maps the user-facing category (see server/utils/validation/expense.ts) to the chart-
// of-accounts code seeded in server/db/seed.ts. Keep these two lists in sync - adding a
// category to one without the other will make LedgerRepo.getAccountIdByCode() throw.
const CATEGORY_TO_ACCOUNT: Record<ExpenseInputType['category'], string> = {
  'Utilities': 'EXP-UTILITIES',
  'Transportation': 'EXP-TRANSPORT',
  'Maintenance': 'EXP-MAINTENANCE',
  'Office Supplies': 'EXP-OFFICE',
  'Business Loss': 'EXP-LOSS',
  'Donation': 'EXP-OTHER'
}

/**
 * Simplest Unit-of-Work in the app: one expense row + one balanced ledger posting
 * (Debit the category's expense account, Credit Cash), assuming - same as the
 * original spreadsheet's Expense Register - that expenses are paid immediately rather
 * than run up on credit. If you ever need "expense on credit" (a running vendor tab),
 * that's a Creditors-style extension, not a change to this method's shape.
 */
export class ExpensesService {
  private repo: ExpensesRepo
  private ledger: LedgerService

  constructor(private database: Database) {
    this.repo = new ExpensesRepo(database)
    this.ledger = new LedgerService(database)
  }

  list(filters: { from?: string; to?: string; category?: string }) {
    return this.repo.list(filters)
  }

  async record(input: ExpenseInputType, userId: string) {
    const expenseNo = await this.repo.nextExpenseNo()
    const accountCode = CATEGORY_TO_ACCOUNT[input.category]

    return this.database.transaction(async (tx) => {
      const dbTx = tx as unknown as Database

      const expenseRow = await this.repo.insert(dbTx, {
        expenseNo,
        expenseDate: input.expenseDate,
        category: input.category,
        description: input.description,
        vendor: input.vendor,
        amount: String(input.amount),
        paymentMode: input.paymentMode,
        department: input.department,
        createdBy: userId
      })

      await this.ledger.post(
        dbTx,
        [
          { accountCode, debit: input.amount },
          { accountCode: 'CASH', credit: input.amount }
        ],
        {
          entryDate: input.expenseDate,
          description: input.description,
          referenceType: 'expense',
          referenceId: expenseRow.id,
          createdBy: userId
        }
      )

      return expenseRow
    })
  }
}

export const expensesService = new ExpensesService(db)
