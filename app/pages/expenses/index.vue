<script setup lang="ts">
interface Expense {
  id: string
  expenseNo: string
  expenseDate: string
  category: string
  description: string
  vendor: string | null
  amount: string
  paymentMode: string
  department: string | null
}

const { data: expenseList, refresh } = await useFetch<Expense[]>('/api/expenses')

const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')

const categories = ['Utilities', 'Transportation', 'Maintenance', 'Office Supplies', 'Business Loss', 'Donation']

const form = reactive({
  expenseDate: new Date().toISOString().slice(0, 10),
  category: 'Utilities',
  description: '',
  vendor: '',
  amount: 0,
  paymentMode: 'Cash',
  department: ''
})

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch('/api/expenses', {
      method: 'POST',
      body: {
        expenseDate: form.expenseDate,
        category: form.category,
        description: form.description,
        vendor: form.vendor || undefined,
        amount: form.amount,
        paymentMode: form.paymentMode,
        department: form.department || undefined
      }
    })
    showForm.value = false
    form.description = ''; form.vendor = ''; form.amount = 0; form.department = ''
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.data?.formErrors?.[0] || e?.data?.statusMessage || 'Could not save expense'
  } finally {
    submitting.value = false
  }
}

function fmt(v: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="font-size: 20px; margin: 0;">Expenses</h1>
      <button style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New Expense' }}
      </button>
    </div>

    <form v-if="showForm" class="card" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;" @submit.prevent="submit">
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Date</label>
        <input v-model="form.expenseDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Category</label>
        <select v-model="form.category" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Amount (Rs)</label>
        <input v-model.number="form.amount" type="number" min="0.01" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 2;">
        <label style="display:block; font-size:12px; margin-bottom:4px;">Description</label>
        <input v-model="form.description" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
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
        <label style="display:block; font-size:12px; margin-bottom:4px;">Vendor (optional)</label>
        <input v-model="form.vendor" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Department (optional)</label>
        <input v-model="form.department" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 3;">
        <div v-if="formError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ formError }}</div>
        <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
          {{ submitting ? 'Saving…' : 'Save Expense' }}
        </button>
      </div>
    </form>

    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Date</th><th style="padding: 8px;">Expense No</th><th style="padding: 8px;">Category</th>
          <th style="padding: 8px;">Description</th><th style="padding: 8px;">Vendor</th>
          <th style="padding: 8px; text-align: right;">Amount</th><th style="padding: 8px;">Mode</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in expenseList" :key="e.id" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ e.expenseDate }}</td>
          <td style="padding: 8px;">{{ e.expenseNo }}</td>
          <td style="padding: 8px;">{{ e.category }}</td>
          <td style="padding: 8px;">{{ e.description }}</td>
          <td style="padding: 8px;">{{ e.vendor || '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ fmt(e.amount) }}</td>
          <td style="padding: 8px;">{{ e.paymentMode }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
