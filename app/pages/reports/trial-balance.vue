<script setup lang="ts">
interface TrialBalanceRow { accountCode: string; accountName: string; debit: number; credit: number }
interface TrialBalanceData { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; difference: number; balanced: boolean }

const { data } = await useFetch<TrialBalanceData>('/api/reports/trial-balance')

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 20px;">Trial Balance</h1>
    <table v-if="data" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Account</th>
          <th style="padding: 8px; text-align: right;">Debit</th>
          <th style="padding: 8px; text-align: right;">Credit</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in data.rows" :key="r.accountCode" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ r.accountName }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ r.debit > 0 ? fmt(r.debit) : '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ r.credit > 0 ? fmt(r.credit) : '—' }}</td>
        </tr>
        <tr style="font-weight: 700; border-top: 2px solid var(--color-text);">
          <td style="padding: 8px;">Total</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ fmt(data.totalDebit) }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ fmt(data.totalCredit) }}</td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="data"
      class="card"
      :style="{ marginTop: '16px', borderColor: data.balanced ? 'var(--color-accent)' : 'var(--color-danger)' }"
    >
      <strong>{{ data.balanced ? 'Balanced' : `Not balanced — difference ${fmt(data.difference)}` }}</strong>
      <p v-if="!data.balanced" style="font-size: 12px; color: var(--color-text-muted); margin: 4px 0 0;">
        Unlike the old spreadsheet, this should never happen if every write goes through LedgerService.
        A nonzero difference here means some code path bypassed it — treat as a bug, not a data issue.
      </p>
    </div>
  </div>
</template>
