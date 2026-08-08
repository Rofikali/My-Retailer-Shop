import { sql, desc, type SQL } from 'drizzle-orm'
import type { Database } from '../db/client'
import { cashTxns } from '../db/schema'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export interface CashTxnListRow {
  [key: string]: unknown
  id: string
  txn_date: string
  voucher_no: string
  particulars: string | null
  category: string
  receipt: string
  payment: string
  payment_mode: string | null
  reference_no: string | null
  status: string
  remarks: string | null
  running_balance: string
  entered_by_name: string | null
  approved_by_name: string | null
}

export class CashBookRepo {
  constructor(private db: Database) {}

  /**
   * Running Balance must be a true cumulative total over ALL transactions in
   * chronological order - it can't be computed only within whatever page/filter the
   * user currently has applied, or the number on screen would be meaningless (and
   * this is exactly the "Running Balance column referenced the wrong rows" bug the
   * original spreadsheet had). So the window function runs over the whole table in a
   * CTE first, filters/pagination are applied after.
   */
  async list(filters: { from?: string; to?: string; category?: string; page: number; pageSize: number }) {
    const conditions: SQL[] = []
    if (filters.from) conditions.push(sql`c.txn_date >= ${filters.from}`)
    if (filters.to) conditions.push(sql`c.txn_date <= ${filters.to}`)
    if (filters.category) conditions.push(sql`c.category = ${filters.category}`)
    const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``

    const result = await this.db.execute<CashTxnListRow>(sql`
      WITH balances AS (
        SELECT id, SUM(receipt - payment) OVER (ORDER BY txn_date, created_at) AS running_balance
        FROM cash_txns
      )
      SELECT
        c.id, c.txn_date, c.voucher_no, c.particulars, c.category,
        c.receipt, c.payment, c.payment_mode, c.reference_no, c.status, c.remarks,
        b.running_balance,
        entered.name AS entered_by_name,
        approved.name AS approved_by_name
      FROM cash_txns c
      JOIN balances b ON b.id = c.id
      LEFT JOIN users entered ON entered.id = c.created_by
      LEFT JOIN users approved ON approved.id = c.approved_by
      ${whereClause}
      ORDER BY c.txn_date DESC, c.created_at DESC
      LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}
    `)

    const rows = Array.from(result as unknown as CashTxnListRow[])

    // voucherType and accountHead are derived here, not stored - see the comment on
    // the cashTxns table definition in server/db/schema.ts for why.
    return rows.map((r) => ({
      id: r.id,
      txnDate: r.txn_date,
      voucherNo: r.voucher_no,
      voucherType: Number(r.receipt) > 0 ? 'Receipt' : 'Payment',
      particulars: r.particulars,
      accountHead: `${capitalize(r.category)} Account`,
      receipt: r.receipt,
      payment: r.payment,
      runningBalance: r.running_balance,
      paymentMode: r.payment_mode,
      referenceNo: r.reference_no,
      category: r.category,
      enteredBy: r.entered_by_name ?? '[Not Recorded]',
      approvedBy: r.approved_by_name ?? '[Not Set]',
      status: capitalize(r.status),
      remarks: r.remarks ?? ''
    }))
  }

  async insert(tx: Database, values: typeof cashTxns.$inferInsert) {
    const [row] = await tx.insert(cashTxns).values(values).returning()
    if (!row) throw new Error('Cash transaction was not created.')
    return row
  }

  async nextVoucherNo(): Promise<string> {
    const [row] = await this.db.select().from(cashTxns).orderBy(desc(cashTxns.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.voucherNo.replace(/\D/g, ''), 10) || 0 : 0
    return `CB-${String(lastNum + 1).padStart(4, '0')}`
  }
}
