import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { customers } from '../../server/db/schema'
import { suppliers } from '../../server/db/schema'
import { products } from '../../server/db/schema'
import { CashBookService } from '../../server/services/cashbook.service'
import { SalesService } from '../../server/services/sales.service'
import { PurchasesService } from '../../server/services/purchases.service'
import { ExpensesService } from '../../server/services/expenses.service'
import { ReportService } from '../../server/services/report.service'

/**
 * This is the single most important integration test file in the codebase, matching
 * priority #2 from docs/08-Testing-Strategy.md: seed a known set of transactions,
 * assert the reports exactly match a hand-calculated expected result.
 *
 * Fixture, worked out by hand:
 *   Capital introduced:        Rs 10,000  (cash in)
 *   Utility expense paid:      Rs    200  (cash out)
 *   Purchase (credit):         100 units @ cost 10   = Rs 1,000 owed to supplier
 *   Sale (credit):               50 units @ price 15 = Rs   750 owed by customer
 *                                 (cost of those 50 units = 50 * 10 = Rs 500)
 *
 *   Expected:
 *     Cash & Bank      = 10,000 - 200                       = 9,800
 *     Sundry Debtors   = 750
 *     Sundry Creditors = 1,000
 *     Inventory value  = 1,000 (purchased) - 500 (COGS)     = 500
 *     Sales Revenue    = 750
 *     COGS             = 500
 *     Gross Profit     = 250
 *     Operating Exp    = 200
 *     Net Profit       = 50
 *     Total Assets                = 9,800 + 750 + 500       = 11,050
 *     Total Liabilities + Capital = 1,000 + (10,000 + 50)   = 11,050   <- balances
 */
describe('Reports reconcile against a known transaction set', () => {
  let userId: string
  let customerId: string
  let supplierId: string
  let productId: string
  const asOfDate = '2026-08-15'

  beforeAll(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId

    const [customer] = await testDb.insert(customers).values({ code: 'CUST-TEST-1', name: 'Test Customer' }).returning()
    customerId = customer.id

    const [supplier] = await testDb.insert(suppliers).values({ code: 'SUP-TEST-1', name: 'Test Supplier', openingBalance: '0' }).returning()
    supplierId = supplier.id

    const [product] = await testDb.insert(products).values({ code: 'PRO-TEST-1', name: 'Test Widget', reorderLevel: '0' }).returning()
    productId = product.id

    const cashBook = new CashBookService(testDb)
    const purchases = new PurchasesService(testDb)
    const sales = new SalesService(testDb)
    const expenses = new ExpensesService(testDb)

    await cashBook.record(
      { txnDate: '2026-08-01', particulars: 'Owner capital', category: 'capital', receipt: 10000, payment: 0, paymentMode: 'Cash' },
      userId
    )

    await purchases.recordPurchase(
      { purchaseDate: '2026-08-02', supplierId, paymentMode: 'credit', items: [{ productId, quantity: 100, unitCost: 10 }] },
      userId
    )

    await sales.recordSale(
      { saleDate: '2026-08-03', customerId, paymentMode: 'credit', items: [{ productId, quantity: 50, costPrice: 10, sellingPrice: 15 }] },
      userId
    )

    await expenses.record(
      { expenseDate: '2026-08-04', category: 'Utilities', description: 'Electricity bill', amount: 200, paymentMode: 'Cash' },
      userId
    )
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('Balance Sheet balances exactly, with the right numbers on both sides', async () => {
    const reportService = new ReportService(testDb)
    const bs = await reportService.balanceSheet(asOfDate)

    expect(bs.assets.cash).toBe(9800)
    expect(bs.assets.debtors).toBe(750)
    expect(bs.assets.inventory).toBe(500)
    expect(bs.assets.total).toBe(11050)
    expect(bs.liabilities.creditors).toBe(1000)
    expect(bs.equity.closingCapital).toBe(10050)
    expect(bs.totalLiabilitiesAndEquity).toBe(11050)
    expect(bs.balanced).toBe(true)
    expect(bs.difference).toBe(0)
  })

  it('Profit & Loss shows the right Gross Profit and Net Profit', async () => {
    const reportService = new ReportService(testDb)
    const pnl = await reportService.profitAndLoss('2026-08-01', asOfDate)

    const totalRevenue = pnl.revenue.reduce((s, r) => s + r.amount, 0)
    expect(totalRevenue).toBe(750)
    expect(pnl.cogs).toBe(500)
    expect(pnl.grossProfit).toBe(250)
    expect(pnl.totalOperatingExpenses).toBe(200)
    expect(pnl.netProfit).toBe(50)
  })

  it('Cash Flow ties out to the actual Cash Book activity', async () => {
    const reportService = new ReportService(testDb)
    const cf = await reportService.cashFlow('2026-08-01', asOfDate)

    // Capital in (10,000) minus utility expense out (200) - the purchase and sale
    // were both on credit, so neither touches cash.
    expect(cf.openingCash).toBe(0)
    expect(cf.closingCash).toBe(9800)
    expect(cf.netChange).toBe(9800)
  })

  it('Trial Balance is balanced and includes the expected accounts', async () => {
    const reportService = new ReportService(testDb)
    const tb = await reportService.trialBalance(asOfDate)

    expect(tb.balanced).toBe(true)
    expect(tb.difference).toBe(0)

    const cashRow = tb.rows.find((r) => r.accountCode === 'CASH')
    expect(cashRow?.debit).toBe(9800)

    const debtorsRow = tb.rows.find((r) => r.accountCode === 'DEBTORS')
    expect(debtorsRow?.debit).toBe(750)
  })

  it('Dashboard summary matches the individual reports it aggregates', async () => {
    const reportService = new ReportService(testDb)
    const dashboard = await reportService.dashboardSummary(asOfDate)

    expect(dashboard.totalRevenue).toBe(750)
    expect(dashboard.grossProfit).toBe(250)
    expect(dashboard.netProfit).toBe(50)
    expect(dashboard.cashBalance).toBe(9800)
    expect(dashboard.sundryDebtors).toBe(750)
    expect(dashboard.sundryCreditors).toBe(1000)
    expect(dashboard.closingStockValue).toBe(500)
  })

  it('Data quality review reports scope and ledger integrity', async () => {
    const reportService = new ReportService(testDb)
    const review = await reportService.dataQualityReview()

    expect(review.scope.customers).toBe(1)
    expect(review.scope.suppliers).toBe(1)
    expect(review.scope.products).toBe(1)
    expect(review.scope.ledgerEntries).toBeGreaterThan(0)
    expect(review.items.find((item) => item.area === 'General Ledger')?.status).toBe('pass')
    expect(review.items.find((item) => item.area === 'Party Ledger')?.status).toBe('pass')
  })
})
