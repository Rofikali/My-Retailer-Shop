import { db } from '../db/client'
import { LedgerService } from './ledger.service'

const ledger = new LedgerService(db)

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
 */
export class ReportService {
  async trialBalance(asOfDate: string) {
    const assets = await ledger.balancesByType('asset', undefined, asOfDate)
    const liabilities = await ledger.balancesByType('liability', undefined, asOfDate)
    const equity = await ledger.balancesByType('equity', undefined, asOfDate)
    const income = await ledger.balancesByType('income', undefined, asOfDate)
    const expense = await ledger.balancesByType('expense', undefined, asOfDate)

    const rows = [...assets, ...liabilities, ...equity, ...income, ...expense].map((r) => ({
      accountCode: r.accountCode,
      accountName: r.accountName,
      debit: Number(r.debit),
      credit: Number(r.credit)
    }))

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
    const income = await ledger.balancesByType('income', from, to)
    const expense = await ledger.balancesByType('expense', from, to)

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
    const cash = await ledger.balanceOf(['CASH'], asOfDate)
    const debtors = await ledger.balanceOf(['DEBTORS'], asOfDate)
    const inventory = await ledger.balanceOf(['INVENTORY'], asOfDate)
    const creditors = -(await ledger.balanceOf(['CREDITORS'], asOfDate)) // liability: credit-normal
    const capital = -(await ledger.balanceOf(['CAPITAL'], asOfDate))
    const drawings = await ledger.balanceOf(['DRAWINGS'], asOfDate)

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
    const openingCash = await ledger.balanceOf(['CASH'], from)
    const closingCash = await ledger.balanceOf(['CASH'], to)

    return {
      from,
      to,
      openingCash,
      closingCash,
      netChange: Math.round((closingCash - openingCash) * 100) / 100
      // Extend with operating/financing activity breakdowns once you have enough
      // transaction volume to make the split meaningful - see HLD for the target shape.
    }
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
}

export const reportService = new ReportService()
