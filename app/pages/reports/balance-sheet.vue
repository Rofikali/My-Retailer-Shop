<script setup lang="ts">
interface BsData {
  assets: { cash: number; debtors: number; inventory: number; total: number }
  liabilities: { creditors: number }
  equity: { openingCapital: number; netProfit: number; drawings: number; closingCapital: number }
  totalLiabilitiesAndEquity: number
  difference: number
  balanced: boolean
}

const { data } = await useFetch<BsData>('/api/reports/balance-sheet')

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 20px;">Balance Sheet</h1>
    <div v-if="data" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 700px;">
      <div class="card">
        <h3 style="margin-top:0;">Assets</h3>
        <div style="display:flex; justify-content:space-between;"><span>Cash &amp; Bank</span><span class="kpi-value">{{ fmt(data.assets.cash) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Sundry Debtors</span><span class="kpi-value">{{ fmt(data.assets.debtors) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Closing Stock</span><span class="kpi-value">{{ fmt(data.assets.inventory) }}</span></div>
        <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid var(--color-border); margin-top:8px; padding-top:8px;">
          <span>Total Assets</span><span class="kpi-value">{{ fmt(data.assets.total) }}</span>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Liabilities &amp; Capital</h3>
        <div style="display:flex; justify-content:space-between;"><span>Sundry Creditors</span><span class="kpi-value">{{ fmt(data.liabilities.creditors) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Opening Capital</span><span class="kpi-value">{{ fmt(data.equity.openingCapital) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Net Profit</span><span class="kpi-value">{{ fmt(data.equity.netProfit) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Drawings</span><span class="kpi-value">-{{ fmt(data.equity.drawings) }}</span></div>
        <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid var(--color-border); margin-top:8px; padding-top:8px;">
          <span>Total Liabilities + Capital</span><span class="kpi-value">{{ fmt(data.totalLiabilitiesAndEquity) }}</span>
        </div>
      </div>
    </div>
    <div
      v-if="data"
      class="card"
      :style="{ marginTop: '16px', maxWidth: '700px', borderColor: data.balanced ? 'var(--color-accent)' : 'var(--color-danger)' }"
    >
      <strong>{{ data.balanced ? 'Balanced' : `Difference: ${fmt(data.difference)}` }}</strong>
    </div>
  </div>
</template>
