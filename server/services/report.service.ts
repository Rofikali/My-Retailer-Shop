import { db, type Database } from '../db/client'
import { LedgerService } from './ledger.service'
import { and, eq, gte, lte } from 'drizzle-orm'
import { accounts, businessProfile, customers, expenses, ledgerEntries, partyLedgerEvents, products, purchases, sales, suppliers } from '../db/schema'

interface ReportRow {
  accountCode: string
  accountName: string
  amount: number
}

/**
 * Every method here is a pure read/aggregation over ledger_entries. Nothing here is a
 * separately-maintained number, which is precisely the property the Excel version
 * lacked - these numbers cannot drift from the transactions that produced them because
 * there is nowhere else for them to be stored.
 *
 * Takes an injectable Database (defaults to the real app db) so integration tests can
 * point it at TEST_DATABASE_URL instead - see tests/integration/reports.test.ts.
 */
export class ReportService {
  private ledger: LedgerService

  constructor(private database: Database = db) {
    this.ledger = new LedgerService(database)
  }

  async trialBalance(asOfDate: string) {
    const assets = (await this.ledger.balancesByType('asset', undefined, asOfDate)).map((row) => ({ ...row, ledgerGroup: 'Asset' }))
    const liabilities = (await this.ledger.balancesByType('liability', undefined, asOfDate)).map((row) => ({ ...row, ledgerGroup: 'Liability' }))
    const equity = (await this.ledger.balancesByType('equity', undefined, asOfDate)).map((row) => ({ ...row, ledgerGroup: 'Equity' }))
    const income = (await this.ledger.balancesByType('income', undefined, asOfDate)).map((row) => ({ ...row, ledgerGroup: 'Income' }))
    const expense = (await this.ledger.balancesByType('expense', undefined, asOfDate)).map((row) => ({ ...row, ledgerGroup: 'Expense' }))

    const rows = [...assets, ...liabilities, ...equity, ...income, ...expense].map((row) => {
      const net = Number(row.debit) - Number(row.credit)
      return {
        accountCode: row.accountCode,
        accountName: row.accountName,
        debit: Math.max(net, 0),
        credit: Math.max(-net, 0),
        ledgerGroup: row.ledgerGroup,
        difference: Math.round(net * 100) / 100,
        status: net >= 0 ? 'Dr Balance' : 'Cr Balance',
        remarks: 'Calculated from posted General Ledger entries.'
      }
    })

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

    return {
      asOfDate,
      rows,
      totalDebit,
      totalCredit,
      difference: Math.round((totalDebit - totalCredit) * 100) / 100,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01
    }
  }

  async profitAndLoss(from: string, to: string) {
    const income = await this.ledger.balancesByType('income', from, to)
    const expense = await this.ledger.balancesByType('expense', from, to)

    const toRows = (rs: typeof income): ReportRow[] =>
      rs.map((r) => ({ accountCode: r.accountCode, accountName: r.accountName, amount: Number(r.credit) - Number(r.debit) }))

    const revenue = toRows(income)
    const cogsRow = expense.find((e) => e.accountCode === 'COGS')
    const cogs = cogsRow ? Number(cogsRow.debit) - Number(cogsRow.credit) : 0
    const otherExpenseRows = expense
      .filter((e) => e.accountCode !== 'COGS')
      .map((r) => ({ accountCode: r.accountCode, accountName: r.accountName, amount: Number(r.debit) - Number(r.credit) }))

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0)
    const grossProfit = totalRevenue - cogs
    const totalOperatingExpenses = otherExpenseRows.reduce((s, r) => s + r.amount, 0)
    const netProfit = grossProfit - totalOperatingExpenses

    return { from, to, revenue, cogs, grossProfit, expenses: otherExpenseRows, totalOperatingExpenses, netProfit }
  }

  async balanceSheet(asOfDate: string) {
    const cash = await this.ledger.balanceOf(['CASH'], asOfDate)
    const debtors = await this.ledger.balanceOf(['DEBTORS'], asOfDate)
    const inventory = await this.ledger.balanceOf(['INVENTORY'], asOfDate)
    const creditors = -(await this.ledger.balanceOf(['CREDITORS'], asOfDate)) // liability: credit-normal
    const capital = -(await this.ledger.balanceOf(['CAPITAL'], asOfDate))
    const drawings = await this.ledger.balanceOf(['DRAWINGS'], asOfDate)

    const pnl = await this.profitAndLoss('0001-01-01', asOfDate)

    const totalAssets = cash + debtors + inventory
    const closingCapital = capital - drawings + pnl.netProfit
    const totalLiabilitiesAndEquity = creditors + closingCapital

    return {
      asOfDate,
      assets: { cash, debtors, inventory, total: totalAssets },
      liabilities: { creditors },
      equity: { openingCapital: capital, netProfit: pnl.netProfit, drawings, closingCapital },
      totalLiabilitiesAndEquity,
      difference: Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100,
      balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
    }
  }

  async cashFlow(from: string, to: string) {
    const openingCash = await this.ledger.balanceBefore(['CASH'], from)
    const closingCash = await this.ledger.balanceOf(['CASH'], to)
    const sourceRows = await this.database.select({ entryDate:ledgerEntries.entryDate, referenceId:ledgerEntries.referenceId, accountCode:accounts.code, accountName:accounts.name, debit:ledgerEntries.debit, credit:ledgerEntries.credit }).from(ledgerEntries).innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id)).where(and(gte(ledgerEntries.entryDate, from), lte(ledgerEntries.entryDate, to)))
    const groups = new Map<string, typeof sourceRows>()
    for (const row of sourceRows) { const key = row.referenceId || row.entryDate; const group = groups.get(key) || []; group.push(row); groups.set(key, group) }
    const operating = new Map<string, { label:string; amount:number }>()
    const financing = new Map<string, { label:string; amount:number }>()
    for (const group of groups.values()) {
      const cashRows = group.filter((row) => row.accountCode === 'CASH')
      const counterpart = group.find((row) => row.accountCode !== 'CASH')
      if (!counterpart) continue
      for (const cashRow of cashRows) {
        const amount = Number(cashRow.debit) - Number(cashRow.credit)
        const target = counterpart.accountCode === 'CAPITAL' || counterpart.accountCode === 'DRAWINGS' ? financing : operating
        const current = target.get(counterpart.accountCode) || { label: counterpart.accountName, amount: 0 }
        current.amount += amount; target.set(counterpart.accountCode, current)
      }
    }
    const toRows = (rows: Map<string, { label:string; amount:number }>) => [...rows.values()].map((row) => ({ ...row, amount:Math.round(row.amount * 100) / 100 }))
    const operatingRows = toRows(operating)
    const financingRows = toRows(financing)
    const netOperating = operatingRows.reduce((sum, row) => sum + row.amount, 0)
    const netFinancing = financingRows.reduce((sum, row) => sum + row.amount, 0)
    const netChange = Math.round((netOperating + netFinancing) * 100) / 100
    return { from, to, openingCash, closingCash, netChange, operating:{ rows:operatingRows, total:Math.round(netOperating * 100) / 100 }, financing:{ rows:financingRows, total:Math.round(netFinancing * 100) / 100 }, tieOutDifference:Math.round((closingCash - openingCash - netChange) * 100) / 100, tiedOut:Math.abs(closingCash - openingCash - netChange) < 0.01 }
  }

  async dashboardSummary(asOfDate: string) {
    const [pnl, bs] = await Promise.all([
      this.profitAndLoss(`${asOfDate.slice(0, 4)}-01-01`, asOfDate),
      this.balanceSheet(asOfDate)
    ])

    return {
      totalRevenue: pnl.revenue.reduce((s, r) => s + r.amount, 0),
      grossProfit: pnl.grossProfit,
      netProfit: pnl.netProfit,
      cashBalance: bs.assets.cash,
      sundryDebtors: bs.assets.debtors,
      sundryCreditors: bs.liabilities.creditors,
      closingStockValue: bs.assets.inventory
    }
  }

  async dataQualityReview() {
    const [profiles, customerRows, supplierRows, productRows, ledgerRows, partyRows, saleRows, purchaseRows, expenseRows] = await Promise.all([
      this.database.select().from(businessProfile),
      this.database.select().from(customers),
      this.database.select().from(suppliers),
      this.database.select().from(products),
      this.database.select({ referenceId: ledgerEntries.referenceId, debit: ledgerEntries.debit, credit: ledgerEntries.credit }).from(ledgerEntries),
      this.database.select({ customerId: partyLedgerEvents.customerId, supplierId: partyLedgerEvents.supplierId }).from(partyLedgerEvents),
      this.database.select({ createdBy: sales.createdBy }).from(sales),
      this.database.select({ createdBy: purchases.createdBy }).from(purchases),
      this.database.select({ createdBy: expenses.createdBy }).from(expenses)
    ])

    type ReviewStatus = 'pass' | 'warning' | 'action'
    type ReviewItem = { area: string; title: string; status: ReviewStatus; detail: string; recommendation: string }
    const items: ReviewItem[] = []
    const add = (item: ReviewItem) => items.push(item)
    const hasPlaceholder = (value: string | null | undefined) => !value || /^\s*\[.*\]\s*$/.test(value) || /your shop|owner name/i.test(value)
    const duplicateNames = (rows: Array<{ name: string }>) => {
      const counts = new Map<string, number>()
      for (const row of rows) {
        const key = row.name.trim().toLowerCase()
        counts.set(key, (counts.get(key) || 0) + 1)
      }
      return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0)
    }
    const missing = (values: Array<string | null | undefined>) => values.filter((value) => hasPlaceholder(value)).length

    const profile = profiles[0]
    const profileIssues = !profile || hasPlaceholder(profile.businessName) || hasPlaceholder(profile.address)
    add({ area: 'Business identity', title: 'Business profile is complete', status: profileIssues ? 'action' : 'pass', detail: !profile ? 'No business profile has been configured.' : profileIssues ? 'Business name or address is still missing or contains a placeholder.' : 'Business name, financial year, and address are configured.', recommendation: 'Complete the business profile before relying on printed or exported reports.' })
    const gstIssue = Boolean(profile?.gstRegistered && hasPlaceholder(profile.gstin))
    add({ area: 'GST', title: 'GST configuration is consistent', status: gstIssue ? 'action' : 'pass', detail: gstIssue ? 'GST is enabled but the GSTIN is missing.' : profile?.gstRegistered ? 'GST is enabled with a GSTIN.' : 'GST is marked as not registered.', recommendation: gstIssue ? 'Add the registered GSTIN or disable GST registration in Settings.' : 'Review this setting with your accountant before production use.' })

    const duplicateCustomers = duplicateNames(customerRows)
    const incompleteCustomers = missing(customerRows.flatMap((row) => [row.phone, row.address, row.city, row.state, row.pinCode]))
    add({ area: 'Customer Master', title: 'Customer master data is unique and usable', status: duplicateCustomers || incompleteCustomers ? 'warning' : 'pass', detail: `${customerRows.length} customer(s); ${duplicateCustomers} duplicate-name row(s) and ${incompleteCustomers} missing core field(s).`, recommendation: 'Merge duplicate parties and complete contact/address data; never create a second master for a repeat customer.' })

    const duplicateSuppliers = duplicateNames(supplierRows)
    const incompleteSuppliers = missing(supplierRows.flatMap((row) => [row.phone, row.address, row.city, row.state, row.pinCode]))
    add({ area: 'Supplier Master', title: 'Supplier master data is unique and usable', status: duplicateSuppliers || incompleteSuppliers ? 'warning' : 'pass', detail: `${supplierRows.length} supplier(s); ${duplicateSuppliers} duplicate-name row(s) and ${incompleteSuppliers} missing core field(s).`, recommendation: 'Keep one supplier master per legal party and complete contact/address data.' })

    const incompleteProducts = productRows.filter((row) => missing([row.category, row.unit, row.costPrice, row.sellingPrice])).length
    add({ area: 'Product Catalog', title: 'Products have pricing and classification', status: incompleteProducts ? 'warning' : 'pass', detail: `${productRows.length} product(s); ${incompleteProducts} product(s) are missing category, unit, cost, or selling price.`, recommendation: 'Complete product defaults before posting sales, purchases, or stock adjustments.' })

    const journalGroups = new Map<string, { debit: number; credit: number }>()
    for (const row of ledgerRows) {
      const key = row.referenceId || 'unreferenced'
      const current = journalGroups.get(key) || { debit: 0, credit: 0 }
      current.debit += Number(row.debit)
      current.credit += Number(row.credit)
      journalGroups.set(key, current)
    }
    const unbalancedPostings = [...journalGroups.values()].filter((group) => Math.abs(group.debit - group.credit) >= 0.01).length
    add({ area: 'General Ledger', title: 'Posted entries remain balanced', status: unbalancedPostings ? 'action' : 'pass', detail: `${ledgerRows.length} ledger row(s); ${unbalancedPostings} posting group(s) are out of balance.`, recommendation: 'Stop release if any posting is unbalanced; correct through reversal and reposting, never direct edits.' })

    const partyRowsWithoutParty = partyRows.filter((row) => !row.customerId && !row.supplierId).length
    add({ area: 'Party Ledger', title: 'Party transactions link to a master', status: partyRowsWithoutParty ? 'action' : 'pass', detail: `${partyRows.length} party transaction(s); ${partyRowsWithoutParty} row(s) have no customer or supplier link.`, recommendation: 'Link every party transaction to exactly one master so balances and statements reconcile.' })

    const missingAuditOwner = [...saleRows, ...purchaseRows, ...expenseRows].filter((row) => !row.createdBy).length
    add({ area: 'Audit trail', title: 'Transactions identify the operator', status: missingAuditOwner ? 'warning' : 'pass', detail: `${missingAuditOwner} sale, purchase, or expense row(s) do not identify the user who entered them.`, recommendation: 'Require authenticated users and preserve entered-by and approved-by details for production posting.' })

    const counts = { pass: items.filter((item) => item.status === 'pass').length, warning: items.filter((item) => item.status === 'warning').length, action: items.filter((item) => item.status === 'action').length }
    return { reviewedAt: new Date().toISOString(), counts, readyForProduction: counts.action === 0, scope: { customers: customerRows.length, suppliers: supplierRows.length, products: productRows.length, ledgerEntries: ledgerRows.length, partyLedgerEvents: partyRows.length }, notes: ['Customer and Supplier Masters are static identity records; ledgers are the dynamic transaction history.', 'Financial reports are calculated from the append-only General Ledger and should be reviewed before release.', 'A warning is a data-quality improvement; an action item blocks production reliance until resolved.'], items }
  }
}

export const reportService = new ReportService()
