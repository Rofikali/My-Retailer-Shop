<script setup lang="ts">
interface DashboardRow { label: string; amount: number }
interface DashboardSummary {
  businessName: string; from: string; to: string; totalRevenue: number; grossProfit: number; netProfit: number
  cashBalance: number; sundryDebtors: number; sundryCreditors: number; closingStockValue: number
  itemsNeedingReorder: number; totalOperatingExpenses: number; expenseBreakdown: DashboardRow[]; revenueCostNet: DashboardRow[]
}

const today = new Date().toISOString().slice(0, 10)
const monthStart = `${today.slice(0, 8)}01`
const filters = reactive({ from: monthStart, to: today })
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending, error, refresh } = await useFetch<DashboardSummary>('/api/reports/dashboard-summary', {
  headers,
  server: false,
  query: { from: computed(() => filters.from), asOf: computed(() => filters.to) }
})

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const maxChartValue = computed(() => Math.max(...(data.value?.revenueCostNet || []).map((row) => Math.abs(row.amount)), 1))
const chartColor = (index: number) => ['#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'][index % 6]
const retry = () => refresh()
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-heading">
      <div><h1>RetailShop - Executive Dashboard</h1><p>{{ data?.businessName || 'Business Dashboard' }}</p></div>
      <form class="period-form" @submit.prevent="retry"><label>From <input v-model="filters.from" type="date"></label><label>To <input v-model="filters.to" type="date"></label><button class="button" type="submit">Refresh</button></form>
    </div>
    <div v-if="pending" class="card">Loading dashboard…</div>
    <div v-else-if="error" class="card error">Could not load dashboard data: {{ error.message }} <button class="button button--secondary" type="button" @click="retry">Retry</button></div>
    <template v-else-if="data">
      <p class="period">Period: {{ data.from }} to {{ data.to }}</p>
      <div class="kpi-grid">
        <article v-for="item in [['Total Sales Revenue', data.totalRevenue], ['Gross Profit', data.grossProfit], ['Net Profit', data.netProfit], ['Cash Balance', data.cashBalance], ['Sundry Debtors (Owed to Shop)', data.sundryDebtors], ['Sundry Creditors (Owed by Shop)', data.sundryCreditors], ['Closing Stock Value', data.closingStockValue], ['Items Needing Reorder', data.itemsNeedingReorder], ['Total Operating Expenses', data.totalOperatingExpenses]]" :key="item[0]" class="kpi-card"><span>{{ item[0] }}</span><strong>{{ item[0] === 'Items Needing Reorder' ? item[1] : currency(Number(item[1])) }}</strong></article>
      </div>
      <div class="chart-grid">
        <section class="card chart-card"><h2>Expense Breakdown by Category</h2><div v-if="data.expenseBreakdown.length" class="expense-list"><div v-for="(row, index) in data.expenseBreakdown" :key="row.label" class="expense-row"><span><i :style="{ background: chartColor(index) }"></i>{{ row.label }}</span><b>{{ currency(row.amount) }}</b><div class="expense-track"><div :style="{ width: `${(row.amount / data.totalOperatingExpenses) * 100}%`, background: chartColor(index) }"></div></div></div></div><p v-else class="muted">No operating expenses in this period.</p></section>
        <section class="card chart-card"><h2>Revenue vs Costs vs Net Profit</h2><div class="bar-chart"><div v-for="(row, index) in data.revenueCostNet" :key="row.label" class="bar-column"><div class="bar-value">{{ currency(row.amount) }}</div><div class="bar" :style="{ height: `${Math.max((Math.abs(row.amount) / maxChartValue) * 190, 4)}px`, background: chartColor(index) }"></div><span>{{ row.label }}</span></div></div></section>
      </div>
      <p class="source-note">Every number is calculated live from the append-only General Ledger and current inventory movements. No dashboard totals are separately stored.</p>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page { max-width: 1160px; }.dashboard-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }.dashboard-heading h1 { margin: 0; color: #24527a; font-size: 24px; }.dashboard-heading p { margin: 6px 0 0; color: var(--color-muted); }.period-form { display: flex; align-items: end; gap: 8px; }.period-form label { display: grid; gap: 4px; color: var(--color-muted); font-size: 12px; }.period-form input { padding: 8px; border: 1px solid var(--color-border); border-radius: 5px; }.button { padding: 9px 14px; border: 1px solid var(--color-accent); border-radius: 6px; background: var(--color-accent); color: white; cursor: pointer; }.button--secondary { margin-left: 8px; background: transparent; color: var(--color-text); border-color: var(--color-border); }.period { color: var(--color-muted); font-size: 13px; }.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 18px; }.kpi-card { min-height: 78px; padding: 14px 16px; background: #eaf2f9; }.kpi-card span { display: block; color: #174d78; font-size: 13px; font-weight: 600; }.kpi-card strong { display: block; margin-top: 10px; color: #2875b8; font-size: 25px; }.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }.card { padding: 18px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }.chart-card { min-height: 330px; }.chart-card h2 { margin: 0 0 20px; text-align: center; font-size: 18px; }.expense-row { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; margin: 13px 0; font-size: 13px; }.expense-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.expense-row i { display: inline-block; width: 10px; height: 10px; margin-right: 7px; }.expense-track { grid-column: 1 / -1; height: 8px; overflow: hidden; border-radius: 5px; background: var(--color-background); }.expense-track div { height: 100%; border-radius: inherit; }.bar-chart { display: flex; height: 245px; align-items: end; justify-content: space-around; gap: 16px; padding: 0 16px 30px; border-bottom: 1px solid var(--color-border); }.bar-column { display: flex; min-width: 70px; height: 100%; flex-direction: column; align-items: center; justify-content: end; gap: 6px; text-align: center; }.bar { width: 52px; min-height: 4px; border-radius: 3px 3px 0 0; }.bar-value { color: var(--color-muted); font-size: 11px; }.bar-column span { font-size: 12px; }.muted, .source-note { color: var(--color-muted); }.source-note { margin-top: 20px; font-size: 12px; }.error { color: var(--color-danger); }
@media (max-width: 800px) { .dashboard-heading, .period-form { flex-direction: column; align-items: stretch; }.period-form { display: grid; grid-template-columns: 1fr 1fr auto; }.kpi-grid { grid-template-columns: repeat(2, 1fr); }.chart-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .kpi-grid, .period-form { grid-template-columns: 1fr; } }
</style>
