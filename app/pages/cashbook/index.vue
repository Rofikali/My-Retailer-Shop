<script setup lang="ts">
interface CashTxn {
  id: string
  txnDate: string
  voucherNo: string
  particulars: string
  category: string
  receipt: string
  payment: string
  paymentMode: string
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
  referenceNo: ''
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
        referenceNo: form.referenceNo || undefined
      }
    })
    showForm.value = false
    form.particulars = ''
    form.amount = 0
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.data?.formErrors?.[0] || e?.data?.statusMessage || 'Could not save transaction'
  } finally {
    submitting.value = false
  }
}

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
}
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
        <label style="display:block; font-size:12px; margin-bottom:4px;">Date</label>
        <input v-model="form.txnDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Category</label>
        <select v-model="form.category" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Direction</label>
        <select v-model="form.direction" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option value="receipt">Money In (Receipt)</option>
          <option value="payment">Money Out (Payment)</option>
        </select>
      </div>
      <div style="grid-column: span 2;">
        <label style="display:block; font-size:12px; margin-bottom:4px;">Particulars</label>
        <input v-model="form.particulars" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Amount (Rs)</label>
        <input v-model.number="form.amount" type="number" min="0.01" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Payment Mode</label>
        <select v-model="form.paymentMode" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Reference No (optional)</label>
        <input v-model="form.referenceNo" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 3;">
        <div v-if="formError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ formError }}</div>
        <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
          {{ submitting ? 'Saving…' : 'Save Entry' }}
        </button>
      </div>
    </form>

    <div v-if="pending">Loading…</div>
    <table v-else style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Date</th>
          <th style="padding: 8px;">Voucher</th>
          <th style="padding: 8px;">Particulars</th>
          <th style="padding: 8px;">Category</th>
          <th style="padding: 8px; text-align: right;">Receipt</th>
          <th style="padding: 8px; text-align: right;">Payment</th>
          <th style="padding: 8px;">Mode</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in txns" :key="t.id" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ t.txnDate }}</td>
          <td style="padding: 8px;">{{ t.voucherNo }}</td>
          <td style="padding: 8px;">{{ t.particulars }}</td>
          <td style="padding: 8px;">{{ t.category }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(t.receipt) > 0 ? formatCurrency(t.receipt) : '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(t.payment) > 0 ? formatCurrency(t.payment) : '—' }}</td>
          <td style="padding: 8px;">{{ t.paymentMode }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
