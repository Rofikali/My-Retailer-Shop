<script setup lang="ts">
interface Customer { id: string; code: string; name: string }
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
interface OpenInvoice { id: string; invoiceNo: string; dueDate: string | null; outstanding: number; status: 'pending' | 'partial' | 'overdue' }

const { user } = useAuth()
const { data: customers } = await useFetch<Customer[]>('/api/customers')
const selectedCustomerId = ref('')
const detail = ref<CustomerDetail | null>(null)
const loading = ref(false)
const submitting = ref(false)
const message = ref('')
const error = ref('')
const selectedEntry = ref<LedgerRow | null>(null)
const openInvoices = ref<OpenInvoice[]>([])
const allocationAmounts = reactive<Record<string, number>>({})
const form = reactive({ entryDate: new Date().toISOString().slice(0, 10), amount: 0, paymentMode: 'cash', referenceNo: '', remarks: '' })
const amendment = reactive({ particulars: '', paymentMode: null as LedgerRow['paymentMode'], referenceNo: '', dueDate: '', remarks: '', reason: '' })

watch(customers, (rows) => { if (!selectedCustomerId.value && rows?.[0]) selectedCustomerId.value = rows[0].id }, { immediate: true })
watch(selectedCustomerId, async (id) => { if (!id) { detail.value = null; return }; loading.value = true; error.value = ''; try { detail.value = await $fetch<CustomerDetail>(`/api/customers/${id}`) } catch (requestError: any) { error.value = requestError?.data?.statusMessage || 'Could not load customer ledger.' } finally { loading.value = false } })
watch(selectedCustomerId, async (id) => {
  openInvoices.value = []
  Object.keys(allocationAmounts).forEach((key) => delete allocationAmounts[key])
  if (!id) return
  try { openInvoices.value = await $fetch<OpenInvoice[]>(`/api/customers/${id}/open-invoices`) } catch { openInvoices.value = [] }
})

const allocatedTotal = computed(() => Object.values(allocationAmounts).reduce((total, amount) => total + (Number(amount) || 0), 0))

function fmt(value: string | number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value)) }
const runningLedger = computed(() => { let balance = 0; return (detail.value?.ledger || []).map((row) => { balance += Number(row.debit) - Number(row.credit); return { ...row, runningBalance: balance } }) })

async function reloadDetail() {
  if (selectedCustomerId.value) detail.value = await $fetch<CustomerDetail>(`/api/customers/${selectedCustomerId.value}`)
}

async function postReceipt() {
  if (!selectedCustomerId.value) return
  submitting.value = true; message.value = ''; error.value = ''
  try {
    if (allocatedTotal.value && Math.abs(allocatedTotal.value - form.amount) > 0.005) { error.value = 'Allocated invoice amounts must equal the receipt amount.'; return }
    const allocations = Object.entries(allocationAmounts).filter(([, amount]) => Number(amount) > 0).map(([saleId, amount]) => ({ saleId, amount: Number(amount) }))
    const result = await $fetch<{ voucherNo: string }>('/api/party-ledger/payments', { method: 'POST', body: { partyType: 'customer', partyId: selectedCustomerId.value, ...form, allocations } })
    message.value = `${result.voucherNo} posted successfully.`
    form.amount = 0; form.referenceNo = ''; form.remarks = ''
    Object.keys(allocationAmounts).forEach((key) => delete allocationAmounts[key])
    await reloadDetail()
    openInvoices.value = await $fetch<OpenInvoice[]>(`/api/customers/${selectedCustomerId.value}/open-invoices`)
  } catch (requestError: any) { error.value = requestError?.data?.statusMessage || 'Could not post customer receipt.' } finally { submitting.value = false }
}

function openAmendment(row: LedgerRow) {
  selectedEntry.value = row
  amendment.particulars = row.particulars || ''
  amendment.paymentMode = row.paymentMode
  amendment.referenceNo = row.referenceNo || ''
  amendment.dueDate = row.dueDate || ''
  amendment.remarks = row.remarks || ''
  amendment.reason = ''
  error.value = ''
}

function closeAmendment() { selectedEntry.value = null; error.value = '' }

async function submitAmendment() {
  if (!selectedEntry.value) return
  submitting.value = true; error.value = ''; message.value = ''
  try {
    await $fetch(`/api/party-ledger/${selectedEntry.value.id}/amendments`, {
      method: 'POST', body: { particulars: amendment.particulars, paymentMode: amendment.paymentMode, referenceNo: amendment.referenceNo || null, dueDate: amendment.dueDate || null, remarks: amendment.remarks || null, reason: amendment.reason }
    })
    message.value = `${selectedEntry.value.voucherNo} amended with audit history retained.`
    await reloadDetail(); closeAmendment()
  } catch (requestError: any) { error.value = requestError?.data?.statusMessage || 'Could not save the ledger amendment.' } finally { submitting.value = false }
}
</script>

<template>
  <main>
    <div class="heading"><div><h1>Customer Ledger</h1><p>Accounts receivable linked to Customer Master. Posted financial values are append-only.</p></div><NuxtLink class="link-button" to="/customers">Customer Master</NuxtLink></div>
    <section class="toolbar card"><label>Customer<select v-model="selectedCustomerId"><option v-for="customer in customers || []" :key="customer.id" :value="customer.id">{{ customer.name }} — {{ customer.code }}</option></select></label><div v-if="detail" class="balance"><span>Running Balance</span><strong>{{ fmt(detail.outstandingBalance) }}</strong></div></section>
    <p class="control-note">Owners may amend particulars, payment mode, reference number, due date, and remarks with a reason. Date, customer ID, voucher, amounts, balance, and audit users remain locked.</p>
    <form v-if="detail" class="card receipt-form" @submit.prevent="postReceipt"><h2>Record Customer Receipt</h2><label>Date<input v-model="form.entryDate" type="date" required></label><label>Amount (Rs)<input v-model.number="form.amount" type="number" min="0.01" step="0.01" required></label><label>Payment Mode<select v-model="form.paymentMode"><option value="cash">Cash</option><option value="upi">UPI</option></select></label><label>Reference No<input v-model="form.referenceNo" maxlength="100"></label><label class="wide">Remarks<textarea v-model="form.remarks" maxlength="1000"></textarea></label><div v-if="openInvoices.length" class="invoice-allocation wide"><strong>Allocate Receipt to Credit Invoices</strong><span>Optional for advances/opening balances. If used, allocations must equal the receipt amount.</span><div v-for="invoice in openInvoices" :key="invoice.id" class="invoice-row"><label><input v-model.number="allocationAmounts[invoice.id]" type="number" min="0" :max="invoice.outstanding" step="0.01"> {{ invoice.invoiceNo }} · Due {{ invoice.dueDate || '—' }} · {{ invoice.status }}</label><span>Outstanding {{ fmt(invoice.outstanding) }}</span></div><small>Allocated: {{ fmt(allocatedTotal) }}</small></div><div class="form-actions"><span v-if="message" class="success">{{ message }}</span><span v-if="error" class="error">{{ error }}</span><button :disabled="submitting">{{ submitting ? 'Posting...' : 'Post Receipt' }}</button></div></form>
    <form v-if="selectedEntry" class="card amendment-form" @submit.prevent="submitAmendment"><h2>Amend Metadata: {{ selectedEntry.voucherNo }}</h2><label>Particulars<input v-model.trim="amendment.particulars" required maxlength="500"></label><label>Payment Mode<select v-model="amendment.paymentMode"><option :value="null">Not recorded</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="credit">Credit</option></select></label><label>Reference No<input v-model.trim="amendment.referenceNo" maxlength="100"></label><label>Due Date<input v-model="amendment.dueDate" type="date"></label><label class="wide">Remarks<textarea v-model.trim="amendment.remarks" maxlength="1000"></textarea></label><label class="wide">Correction Reason<input v-model.trim="amendment.reason" required minlength="10" maxlength="500" placeholder="Explain why this metadata is being corrected"></label><div class="form-actions"><button :disabled="submitting">{{ submitting ? 'Saving...' : 'Save Amendment' }}</button><button type="button" class="secondary" @click="closeAmendment">Cancel</button><span v-if="error" class="error">{{ error }}</span></div></form>
    <div v-if="loading" class="card">Loading ledger...</div><div v-else-if="detail" class="card table"><table><thead><tr><th>Date</th><th>Voucher No</th><th>Invoice No</th><th>Customer ID</th><th>Customer Name</th><th>Particulars</th><th>Debit - Owes (Rs)</th><th>Credit - Paid (Rs)</th><th>Running Balance (Rs)</th><th>Payment Mode</th><th>Reference No</th><th>Due Date</th><th>Status</th><th>Salesperson</th><th>Remarks</th><th>Entered By</th><th>Approved By</th><th>Action</th></tr></thead><tbody><tr v-for="row in runningLedger" :key="row.id"><td>{{ row.entryDate }}</td><td>{{ row.voucherNo }}</td><td>{{ row.invoiceNo || '—' }}</td><td>{{ detail.code }}</td><td>{{ detail.name }}</td><td>{{ row.particulars || '—' }}</td><td>{{ Number(row.debit) ? fmt(row.debit) : '—' }}</td><td>{{ Number(row.credit) ? fmt(row.credit) : '—' }}</td><td>{{ fmt(row.runningBalance) }}</td><td>{{ row.paymentMode || '—' }}</td><td>{{ row.referenceNo || '—' }}</td><td>{{ row.dueDate || '—' }}</td><td><span :title="row.amendmentReason">{{ row.status }}</span></td><td>{{ row.salespersonName || '—' }}</td><td>{{ row.remarks || '—' }}</td><td>{{ row.enteredByName || '—' }}</td><td>{{ row.approvedByName || '—' }}</td><td><button v-if="user?.role === 'owner' && row.status !== 'reversed'" class="small" @click="openAmendment(row)">Amend</button><span v-else>—</span></td></tr><tr v-if="!runningLedger.length"><td colspan="18" class="empty">No ledger entries for this customer.</td></tr></tbody></table></div>
  </main>
</template>

<style scoped>
main{max-width:100%}.heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}h1{font-size:20px;margin:0 0 4px}.heading p,.control-note{margin:0;color:var(--color-text-muted);font-size:13px}.link-button,button{display:inline-block;padding:8px 12px;background:var(--color-accent);color:#fff;border:0;border-radius:5px;text-decoration:none;cursor:pointer}.toolbar{display:flex;align-items:end;gap:24px;margin-top:16px}.toolbar label{width:360px}label{font-size:12px}input,select,textarea{display:block;width:100%;padding:8px;margin-top:4px;border:1px solid var(--color-border);border-radius:5px;background:var(--color-surface)}.balance{margin-left:auto}.balance span{display:block;font-size:12px;color:var(--color-text-muted)}.balance strong{font-size:20px}.control-note{padding:12px 0}.receipt-form,.amendment-form{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}.amendment-form{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-form h2,.amendment-form h2{grid-column:1/-1;font-size:15px;margin:0}.wide{grid-column:span 2}.invoice-allocation{display:grid;gap:8px;padding:10px;border:1px solid var(--color-border);border-radius:5px}.invoice-allocation>span,.invoice-allocation small{font-size:12px;color:var(--color-text-muted)}.invoice-row{display:flex;justify-content:space-between;align-items:center;gap:12px}.invoice-row label{display:flex;align-items:center;gap:8px}.invoice-row input{width:110px;margin:0}.form-actions{grid-column:1/-1;display:flex;align-items:center;gap:12px}.success{color:var(--color-accent)}.error{color:var(--color-danger)}.secondary,.small{background:none;color:inherit;border:1px solid var(--color-border)}.small{font-size:12px;padding:4px 8px}.table{overflow:auto;margin-top:16px}table{min-width:2050px;width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--color-border)}th{font-size:12px}.empty{text-align:center;padding:24px;color:var(--color-text-muted)}
</style>
