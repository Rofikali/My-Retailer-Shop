<script setup lang="ts">
interface LedgerRow { id: string; entryDate: string; voucherNo: string; invoiceNo: string | null; particulars: string | null; debit: string; credit: string; paymentMode: string | null; referenceNo: string | null; dueDate: string | null; status: string; salespersonName: string | null; remarks: string | null; enteredByName: string | null; approvedByName: string | null }
interface CustomerDetail { id: string; code: string; name: string; outstandingBalance: number; ledger: LedgerRow[] }
const route = useRoute()
const { data } = await useFetch<CustomerDetail>(`/api/customers/${route.params.id}`)
function fmt(value: number | string) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) }
const runningLedger = computed(() => {
  if (!data.value) return []
  let balance = 0
  return data.value.ledger.map((row) => { balance += Number(row.debit) - Number(row.credit); return { ...row, runningBalance: balance } })
})
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/customers" style="font-size:13px;">← Back to Customer Master</NuxtLink>
    <div style="display:flex; justify-content:space-between; align-items:end; margin:12px 0 20px;"><div><h1 style="font-size:20px; margin:0;">Customer Ledger</h1><p style="color:var(--color-text-muted); margin:4px 0 0;">{{ data.name }} · {{ data.code }}</p></div><div class="card" style="margin:0; padding:10px 14px;"><div style="font-size:12px; color:var(--color-text-muted);">Running Balance</div><strong class="kpi-value">{{ fmt(data.outstandingBalance) }}</strong></div></div>
    <div style="overflow-x:auto;"><table style="width:100%; min-width:1900px; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid var(--color-border);"><th style="padding:8px;">Date</th><th style="padding:8px;">Voucher No</th><th style="padding:8px;">Invoice No</th><th style="padding:8px;">Customer ID</th><th style="padding:8px;">Customer Name</th><th style="padding:8px;">Particulars</th><th style="padding:8px;">Debit - Owes (Rs)</th><th style="padding:8px;">Credit - Paid (Rs)</th><th style="padding:8px;">Running Balance (Rs)</th><th style="padding:8px;">Payment Mode</th><th style="padding:8px;">Reference No</th><th style="padding:8px;">Due Date</th><th style="padding:8px;">Status</th><th style="padding:8px;">Salesperson</th><th style="padding:8px;">Remarks</th><th style="padding:8px;">Entered By</th><th style="padding:8px;">Approved By</th></tr></thead><tbody><tr v-for="row in runningLedger" :key="row.id" style="border-bottom:1px solid var(--color-border);"><td style="padding:8px;">{{ row.entryDate }}</td><td style="padding:8px;">{{ row.voucherNo }}</td><td style="padding:8px;">{{ row.invoiceNo || '—' }}</td><td style="padding:8px;">{{ data.code }}</td><td style="padding:8px;">{{ data.name }}</td><td style="padding:8px;">{{ row.particulars || '—' }}</td><td style="padding:8px;">{{ Number(row.debit) > 0 ? fmt(row.debit) : '—' }}</td><td style="padding:8px;">{{ Number(row.credit) > 0 ? fmt(row.credit) : '—' }}</td><td style="padding:8px;">{{ fmt(row.runningBalance) }}</td><td style="padding:8px;">{{ row.paymentMode || '—' }}</td><td style="padding:8px;">{{ row.referenceNo || '—' }}</td><td style="padding:8px;">{{ row.dueDate || '—' }}</td><td style="padding:8px;">{{ row.status }}</td><td style="padding:8px;">{{ row.salespersonName || '—' }}</td><td style="padding:8px;">{{ row.remarks || '—' }}</td><td style="padding:8px;">{{ row.enteredByName || '—' }}</td><td style="padding:8px;">{{ row.approvedByName || '—' }}</td></tr></tbody></table></div>
  </div>
</template>
