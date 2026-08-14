<script setup lang="ts">
interface DashboardSummary {
  totalRevenue: number
  grossProfit: number
  netProfit: number
  cashBalance: number
  sundryDebtors: number
  sundryCreditors: number
  closingStockValue: number
}

const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending, error, refresh } = await useFetch<DashboardSummary>('/api/reports/dashboard-summary', {
  headers,
  server: false
})

onMounted(() => refresh())
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 20px;">Dashboard</h1>

    <div v-if="pending">Loading…</div>
    <div v-else-if="error" class="card" style="border-color: var(--color-danger);">
      Could not load dashboard data: {{ error.message }}
      <button style="margin-left: 8px;" @click="refresh()">Retry</button>
    </div>
    <div v-else-if="data" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
      <UiKpiCard label="Total Revenue" :value="data.totalRevenue" format="currency" />
      <UiKpiCard label="Gross Profit" :value="data.grossProfit" format="currency" />
      <UiKpiCard label="Net Profit" :value="data.netProfit" format="currency" />
      <UiKpiCard label="Cash Balance" :value="data.cashBalance" format="currency" />
      <UiKpiCard label="Sundry Debtors" :value="data.sundryDebtors" format="currency" />
      <UiKpiCard label="Sundry Creditors" :value="data.sundryCreditors" format="currency" />
      <UiKpiCard label="Closing Stock Value" :value="data.closingStockValue" format="currency" />
    </div>

    <p style="margin-top: 24px; font-size: 12px; color: var(--color-text-muted);">
      Every number above is computed live from <code>ledger_entries</code> — there is no separately
      maintained "dashboard total" that can drift from the underlying transactions.
    </p>
  </div>
</template>
