<script setup lang="ts">
interface CashTxn {
  id: string
  txnDate: string
  voucherNo: string
  voucherType: string
  particulars: string
  accountHead: string
  receipt: string
  payment: string
  runningBalance: string
  paymentMode: string
  referenceNo: string | null
  category: string
  enteredBy: string
  approvedBy: string
  status: string
  remarks: string
}

const { data: txns, pending, refresh } = await useFetch<CashTxn[]>('/api/cash-txns')

const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')

const form = reactive({
  txnDate: new Date().toISOString().slice(0, 10),
  particulars: '',
  category: 'expense',
  direction: 'payment' as 'receipt' | 'payment',
  amount: 0,
  paymentMode: 'Cash',
  referenceNo: '',
  remarks: ''
})

const categories = ['capital', 'sales', 'expense', 'drawings', 'purchase', 'other']

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch('/api/cash-txns', {
      method: 'POST',
      body: {
        txnDate: form.txnDate,
        particulars: form.particulars,
        category: form.category,
        receipt: form.direction === 'receipt' ? form.amount : 0,
        payment: form.direction === 'payment' ? form.amount : 0,
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo || undefined,
        remarks: form.remarks || undefined
      }
    })
    showForm.value = false
    form.particulars = ''
    form.amount = 0
    form.remarks = ''
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.data?.formErrors?.[0] || e?.data?.statusMessage || 'Could not save transaction'
  } finally {
    submitting.value = false
  }
}

function fmt(v: string | number) {
  const n = Number(v)
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const columns = [
  'Date', 'Voucher No', 'Voucher Type', 'Particulars', 'Account Head',
  'Receipt (Rs)', 'Payment (Rs)', 'Running Balance (Rs)', 'Payment Mode',
  'Reference No', 'Category', 'Entered By', 'Approved By', 'Status', 'Remarks'
]
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="font-size: 20px; margin: 0;">Cash Book</h1>
      <button
        style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Cancel' : '+ New Entry' }}
      </button>
    </div>

    <form v-if="showForm" class="card" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;" @submit.prevent="submit">
      <div>
        <label for="cash-txn-date" style="display:block; font-size:12px; margin-bottom:4px;">Date</label>
        <input id="cash-txn-date" v-model="form.txnDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label for="cash-txn-category" style="display:block; font-size:12px; margin-bottom:4px;">Category</label>
        <select id="cash-txn-category" v-model="form.category" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label for="cash-txn-direction" style="display:block; font-size:12px; margin-bottom:4px;">Direction</label>
        <select id="cash-txn-direction" v-model="form.direction" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option value="receipt">Money In (Receipt)</option>
          <option value="payment">Money Out (Payment)</option>
        </select>
      </div>
      <div style="grid-column: span 2;">
        <label for="cash-txn-particulars" style="display:block; font-size:12px; margin-bottom:4px;">Particulars</label>
        <input id="cash-txn-particulars" v-model="form.particulars" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label for="cash-txn-amount" style="display:block; font-size:12px; margin-bottom:4px;">Amount (Rs)</label>
        <input id="cash-txn-amount" v-model.number="form.amount" type="number" min="0.01" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label for="cash-txn-payment-mode" style="display:block; font-size:12px; margin-bottom:4px;">Payment Mode</label>
        <select id="cash-txn-payment-mode" v-model="form.paymentMode" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label for="cash-txn-reference-no" style="display:block; font-size:12px; margin-bottom:4px;">Reference No (optional)</label>
        <input id="cash-txn-reference-no" v-model="form.referenceNo" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 2;">
        <label for="cash-txn-remarks" style="display:block; font-size:12px; margin-bottom:4px;">Remarks (optional)</label>
        <input id="cash-txn-remarks" v-model="form.remarks" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 3;">
        <div v-if="formError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ formError }}</div>
        <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
          {{ submitting ? 'Saving…' : 'Save Entry' }}
        </button>
      </div>
    </form>

    <p style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px;">
      Voucher Type, Account Head, and Running Balance are computed, not entered — see the schema comment
      in <code>server/db/schema.ts</code> for why. Approved By stays <code>[Not Set]</code> until an
      approval workflow exists; that's an honest placeholder, not a bug.
    </p>

    <div v-if="pending">Loading…</div>
    <div v-else style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; min-width: 1400px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
            <th v-for="col in columns" :key="col" style="padding: 8px; white-space: nowrap; font-size: 12px;">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in txns" :key="t.id" style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 8px; white-space: nowrap;">{{ t.txnDate }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.voucherNo }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.voucherType }}</td>
            <td style="padding: 8px;">{{ t.particulars }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.accountHead }}</td>
            <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(t.receipt) > 0 ? fmt(t.receipt) : '—' }}</td>
            <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(t.payment) > 0 ? fmt(t.payment) : '—' }}</td>
            <td style="padding: 8px; text-align: right;" class="kpi-value">{{ fmt(t.runningBalance) }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.paymentMode }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.referenceNo || '—' }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.category }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.enteredBy }}</td>
            <td style="padding: 8px; white-space: nowrap; color: var(--color-text-muted);">{{ t.approvedBy }}</td>
            <td style="padding: 8px; white-space: nowrap;">{{ t.status }}</td>
            <td style="padding: 8px;">{{ t.remarks || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
