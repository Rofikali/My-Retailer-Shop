import { alias } from 'drizzle-orm/pg-core'
import { and, gte, lte, eq, desc } from 'drizzle-orm'
import type { Database } from '../db/client'
import { expenses, users } from '../db/schema'

const enteredBy = alias(users, 'expense_entered_by')
const approvedBy = alias(users, 'expense_approved_by')

export class ExpensesRepo {
  constructor(private db: Database) {}

  async list(filters: { from?: string; to?: string; category?: string }) {
    const conditions = []
    if (filters.from) conditions.push(gte(expenses.expenseDate, filters.from))
    if (filters.to) conditions.push(lte(expenses.expenseDate, filters.to))
    if (filters.category) conditions.push(eq(expenses.category, filters.category))

    return this.db
      .select({
        id: expenses.id,
        expenseNo: expenses.expenseNo,
        expenseDate: expenses.expenseDate,
        category: expenses.category,
        description: expenses.description,
        vendor: expenses.vendor,
        amount: expenses.amount,
        tax: expenses.tax,
        paymentMode: expenses.paymentMode,
        referenceNo: expenses.referenceNo,
        department: expenses.department,
        status: expenses.status,
        remarks: expenses.remarks,
        approvedByName: approvedBy.name,
        enteredByName: enteredBy.name,
        createdAt: expenses.createdAt
      })
      .from(expenses)
      .leftJoin(approvedBy, eq(expenses.approvedBy, approvedBy.id))
      .leftJoin(enteredBy, eq(expenses.createdBy, enteredBy.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
  }

  async insert(tx: Database, values: typeof expenses.$inferInsert) {
    const [row] = await tx.insert(expenses).values(values).returning()
    if (!row) throw new Error('Expense was not created.')
    return row
  }

  async nextExpenseNo(): Promise<string> {
    const [row] = await this.db.select().from(expenses).orderBy(desc(expenses.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.expenseNo.replace(/\D/g, ''), 10) || 0 : 0
    return `EXP-${String(lastNum + 1).padStart(4, '0')}`
  }
}
