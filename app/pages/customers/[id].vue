<script setup lang="ts">
interface LedgerRow {
  id: string
  entryDate: string
  debit: string
  credit: string
  description: string | null
}
interface CustomerDetail {
  id: string
  code: string
  name: string
  phone: string | null
  outstandingBalance: number
  ledger: LedgerRow[]
}

const route = useRoute()
const { data } = await useFetch<CustomerDetail>(`/api/customers/${route.params.id}`)

function fmt(v: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
}

// Running balance computed client-side for display - same cumulative logic as the
// Cash Book, just done here instead of a SQL window function since this is a single
// customer's small ledger, not a paginated list.
const runningLedger = computed(() => {
  if (!data.value) return []
  let balance = 0
  return data.value.ledger.map((row) => {
    balance += Number(row.debit) - Number(row.credit)
    return { ...row, runningBalance: balance }
  })
})
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/customers" style="font-size: 13px;">← Back to Customers</NuxtLink>
    <h1 style="font-size: 20px; margin: 12px 0 4px;">{{ data.name }} <span style="color: var(--color-text-muted); font-weight: 400;">({{ data.code }})</span></h1>
    <p style="color: var(--color-text-muted); margin-bottom: 20px;">{{ data.phone || '—' }}</p>

    <div class="card" style="max-width: 300px; margin-bottom: 20px;">
      <div style="font-size: 12px; color: var(--color-text-muted);">Outstanding Balance</div>
      <div class="kpi-value" style="font-size: 22px; font-weight: 700;">{{ fmt(data.outstandingBalance) }}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Date</th><th style="padding: 8px;">Description</th>
          <th style="padding: 8px; text-align: right;">Debit</th><th style="padding: 8px; text-align: right;">Credit</th>
          <th style="padding: 8px; text-align: right;">Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in runningLedger" :key="row.id" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ row.entryDate }}</td>
          <td style="padding: 8px;">{{ row.description || '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(row.debit) > 0 ? fmt(row.debit) : '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(row.credit) > 0 ? fmt(row.credit) : '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ fmt(row.runningBalance) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
