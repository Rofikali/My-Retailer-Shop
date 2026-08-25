<script setup lang="ts">
interface LedgerRow {
  id: string
  entryDate: string
  voucherNo: string
  invoiceNo: string | null
  particulars: string | null
  debit: string
  credit: string
  paymentMode: 'cash' | 'upi' | 'credit' | null
  referenceNo: string | null
  dueDate: string | null
  status: string
  salespersonName: string | null
  remarks: string | null
  enteredByName: string | null
  approvedByName: string | null
  amendmentReason?: string
}

interface CustomerDetail { id: string; code: string; name: string; outstandingBalance: number; ledger: LedgerRow[] }

const route = useRoute()
const { user } = useAuth()
const { data, refresh } = await useFetch<CustomerDetail>(`/api/customers/${route.params.id}`)
const selectedEntry = ref<LedgerRow | null>(null)
const submitting = ref(false)
const formError = ref('')
const amendment = reactive({ particulars: '', paymentMode: null as LedgerRow['paymentMode'], referenceNo: '', dueDate: '', remarks: '', reason: '' })

function fmt(value: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value))
}

const runningLedger = computed(() => {
  if (!data.value) return []
  let balance = 0
  return data.value.ledger.map((row) => {
    balance += Number(row.debit) - Number(row.credit)
    return { ...row, runningBalance: balance }
  })
})

function openAmendment(row: LedgerRow) {
  selectedEntry.value = row
  amendment.particulars = row.particulars || ''
  amendment.paymentMode = row.paymentMode
  amendment.referenceNo = row.referenceNo || ''
  amendment.dueDate = row.dueDate || ''
  amendment.remarks = row.remarks || ''
  amendment.reason = ''
  formError.value = ''
}

function closeAmendment() {
  selectedEntry.value = null
  formError.value = ''
}

async function submitAmendment() {
  if (!selectedEntry.value) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch(`/api/party-ledger/${selectedEntry.value.id}/amendments`, {
      method: 'POST',
      body: {
        particulars: amendment.particulars,
        paymentMode: amendment.paymentMode,
        referenceNo: amendment.referenceNo || null,
        dueDate: amendment.dueDate || null,
        remarks: amendment.remarks || null,
        reason: amendment.reason
      }
    })
    await refresh()
    closeAmendment()
  } catch (error: any) {
    formError.value = error?.data?.statusMessage || 'Could not save the ledger amendment.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main v-if="data">
    <NuxtLink to="/customers" style="font-size:13px;">Back to Customer Master</NuxtLink>
    <div style="display:flex; justify-content:space-between; align-items:end; margin:12px 0 20px; gap:16px;">
      <div><h1 style="font-size:20px; margin:0;">Customer Ledger</h1><p style="color:var(--color-text-muted); margin:4px 0 0;">{{ data.name }} · {{ data.code }}</p></div>
      <div class="card" style="margin:0; padding:10px 14px;"><div style="font-size:12px; color:var(--color-text-muted);">Running Balance</div><strong class="kpi-value">{{ fmt(data.outstandingBalance) }}</strong></div>
    </div>

    <div class="card" style="font-size:13px; margin-bottom:16px;">
      <strong>Controlled ledger corrections</strong><br>
      Date, customer ID/name, voucher/invoice numbers, debit, credit, running balance, entered-by, and approval history are locked. Owners can amend operational metadata with a mandatory reason; sales amounts or payment allocation errors require a reversal and corrected source transaction.
    </div>

    <form v-if="selectedEntry" class="card amendment-form" @submit.prevent="submitAmendment">
      <h2>Amend Metadata: {{ selectedEntry.voucherNo }}</h2>
      <label>Particulars<input v-model.trim="amendment.particulars" required maxlength="500"></label>
      <label>Payment Mode<select v-model="amendment.paymentMode"><option :value="null">Not recorded</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="credit">Credit</option></select></label>
      <label>Reference No<input v-model.trim="amendment.referenceNo" maxlength="100"></label>
      <label>Due Date<input v-model="amendment.dueDate" type="date"></label>
      <label class="wide">Remarks<textarea v-model.trim="amendment.remarks" maxlength="1000"></textarea></label>
      <label class="wide">Correction Reason<input v-model.trim="amendment.reason" required minlength="10" maxlength="500" placeholder="Explain why this metadata is being corrected"></label>
      <div class="actions"><button :disabled="submitting">{{ submitting ? 'Saving...' : 'Save Amendment' }}</button><button type="button" class="secondary" @click="closeAmendment">Cancel</button><span v-if="formError" class="error">{{ formError }}</span></div>
    </form>

    <div style="overflow-x:auto;"><table style="width:100%; min-width:2050px; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid var(--color-border);"><th>Date</th><th>Voucher No</th><th>Invoice No</th><th>Customer ID</th><th>Customer Name</th><th>Particulars</th><th>Debit - Owes (Rs)</th><th>Credit - Paid (Rs)</th><th>Running Balance (Rs)</th><th>Payment Mode</th><th>Reference No</th><th>Due Date</th><th>Status</th><th>Salesperson</th><th>Remarks</th><th>Entered By</th><th>Approved By</th><th>Action</th></tr></thead><tbody><tr v-for="row in runningLedger" :key="row.id" style="border-bottom:1px solid var(--color-border);"><td>{{ row.entryDate }}</td><td>{{ row.voucherNo }}</td><td>{{ row.invoiceNo || '—' }}</td><td>{{ data.code }}</td><td>{{ data.name }}</td><td>{{ row.particulars || '—' }}</td><td>{{ Number(row.debit) > 0 ? fmt(row.debit) : '—' }}</td><td>{{ Number(row.credit) > 0 ? fmt(row.credit) : '—' }}</td><td>{{ fmt(row.runningBalance) }}</td><td>{{ row.paymentMode || '—' }}</td><td>{{ row.referenceNo || '—' }}</td><td>{{ row.dueDate || '—' }}</td><td><span :title="row.amendmentReason">{{ row.status }}</span></td><td>{{ row.salespersonName || '—' }}</td><td>{{ row.remarks || '—' }}</td><td>{{ row.enteredByName || '—' }}</td><td>{{ row.approvedByName || '—' }}</td><td><button v-if="user?.role === 'owner' && row.status !== 'reversed'" class="small" @click="openAmendment(row)">Amend</button><span v-else>—</span></td></tr><tr v-if="!runningLedger.length"><td colspan="18" class="empty">No ledger entries for this customer.</td></tr></tbody></table></div>
  </main>
</template>

<style scoped>
main{max-width:100%} th,td{padding:8px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--color-border)} th{font-size:12px}.amendment-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px}.amendment-form h2,.actions{grid-column:1/-1;margin:0;font-size:16px}label{font-size:12px}input,select,textarea{display:block;width:100%;padding:8px;margin-top:4px;border:1px solid var(--color-border);border-radius:5px;background:var(--color-surface)}textarea{min-height:70px}.wide{grid-column:span 2}.actions{display:flex;align-items:center;gap:10px}button{padding:8px 12px;background:var(--color-accent);color:#fff;border:0;border-radius:5px;cursor:pointer}.secondary,.small{background:none;color:inherit;border:1px solid var(--color-border)}.small{font-size:12px;padding:4px 8px}.error{color:var(--color-danger);font-size:13px}.empty{text-align:center;padding:24px;color:var(--color-text-muted)}
</style>
