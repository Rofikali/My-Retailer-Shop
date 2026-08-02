<script setup lang="ts">
interface CfData { openingCash: number; closingCash: number; netChange: number }
const { data } = await useFetch<CfData>('/api/reports/cash-flow')

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 20px;">Cash Flow Statement</h1>
    <div v-if="data" class="card" style="max-width: 420px;">
      <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Opening Cash</span><span class="kpi-value">{{ fmt(data.openingCash) }}</span></div>
      <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Net Change</span><span class="kpi-value">{{ fmt(data.netChange) }}</span></div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; font-weight:700; border-top:1px solid var(--color-border);">
        <span>Closing Cash</span><span class="kpi-value">{{ fmt(data.closingCash) }}</span>
      </div>
    </div>
    <p style="font-size:12px; color: var(--color-text-muted); max-width: 420px;">
      This is a simplified opening/closing view. Extend <code>ReportService.cashFlow()</code> with an
      Operating/Financing activity breakdown once transaction volume makes that split meaningful — see
      the HLD doc for the target shape.
    </p>
  </div>
</template>
