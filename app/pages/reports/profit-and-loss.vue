<script setup lang="ts">
interface Row { accountCode: string; accountName: string; amount: number }
interface PnlData { revenue: Row[]; cogs: number; grossProfit: number; expenses: Row[]; totalOperatingExpenses: number; netProfit: number }

const { data } = await useFetch<PnlData>('/api/reports/profit-and-loss')

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 20px;">Profit &amp; Loss Statement</h1>
    <div v-if="data" class="card" style="max-width: 480px;">
      <div v-for="r in data.revenue" :key="r.accountCode" style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span>{{ r.accountName }}</span><span class="kpi-value">{{ fmt(r.amount) }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0; color: var(--color-text-muted);">
        <span>Less: Cost of Goods Sold</span><span class="kpi-value">{{ fmt(data.cogs) }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: 700; border-top: 1px solid var(--color-border);">
        <span>Gross Profit</span><span class="kpi-value">{{ fmt(data.grossProfit) }}</span>
      </div>
      <div v-for="r in data.expenses" :key="r.accountCode" style="display: flex; justify-content: space-between; padding: 4px 0; color: var(--color-text-muted);">
        <span>{{ r.accountName }}</span><span class="kpi-value">{{ fmt(r.amount) }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: 700; border-top: 2px solid var(--color-text); color: var(--color-accent);">
        <span>Net Profit</span><span class="kpi-value">{{ fmt(data.netProfit) }}</span>
      </div>
    </div>
  </div>
</template>
