<script setup lang="ts">
interface Expense { id: string; expenseNo: string; expenseDate: string; category: string; description: string | null; vendor: string | null; amount: string; tax: string; paymentMode: string | null; referenceNo: string | null; department: string | null; approvedByName: string | null; status: string; remarks: string | null; enteredByName: string | null }
const { data: expenseList, refresh } = await useFetch<Expense[]>('/api/expenses')
const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const categories = ['Utilities', 'Transportation', 'Maintenance', 'Office Supplies', 'Business Loss', 'Donation']
const form = reactive({ expenseDate: new Date().toISOString().slice(0, 10), category: 'Utilities', description: '', vendor: '', amount: 0, tax: 0, paymentMode: 'Cash', referenceNo: '', department: '', remarks: '' })
const totalPaid = computed(() => form.amount + form.tax)
function fmt(value: string | number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) }
async function submit() {
  formError.value = ''; submitting.value = true
  try {
    await $fetch('/api/expenses', { method: 'POST', body: { expenseDate: form.expenseDate, category: form.category, description: form.description, vendor: form.vendor || undefined, amount: form.amount, tax: form.tax, paymentMode: form.paymentMode, referenceNo: form.referenceNo || undefined, department: form.department || undefined, remarks: form.remarks || undefined } })
    showForm.value = false
    Object.assign(form, { description: '', vendor: '', amount: 0, tax: 0, referenceNo: '', department: '', remarks: '' })
    await refresh()
  } catch (error: any) { formError.value = error?.data?.data?.formErrors?.[0] || error?.data?.statusMessage || 'Could not save expense' }
  finally { submitting.value = false }
}
</script>

<template>
  <div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h1 style="font-size:20px; margin:0;">Expenses Registry</h1><button style="padding:8px 14px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;" @click="showForm = !showForm">{{ showForm ? 'Cancel' : '+ New Expense' }}</button></div>
    <form v-if="showForm" class="card" style="margin-bottom:20px; display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;" @submit.prevent="submit">
      <div><label for="expense-date" style="display:block; font-size:12px; margin-bottom:4px;">Date</label><input id="expense-date" v-model="form.expenseDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="expense-category" style="display:block; font-size:12px; margin-bottom:4px;">Category</label><select id="expense-category" v-model="form.category" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"><option v-for="category in categories" :key="category" :value="category">{{ category }}</option></select></div>
      <div><label for="expense-payment" style="display:block; font-size:12px; margin-bottom:4px;">Payment Mode</label><select id="expense-payment" v-model="form.paymentMode" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Other</option></select></div>
      <div style="grid-column:span 2;"><label for="expense-description" style="display:block; font-size:12px; margin-bottom:4px;">Description</label><input id="expense-description" v-model="form.description" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="expense-vendor" style="display:block; font-size:12px; margin-bottom:4px;">Vendor</label><input id="expense-vendor" v-model="form.vendor" maxlength="150" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="expense-amount" style="display:block; font-size:12px; margin-bottom:4px;">Amount (Rs)</label><input id="expense-amount" v-model.number="form.amount" type="number" min="0.01" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="expense-tax" style="display:block; font-size:12px; margin-bottom:4px;">Tax (Rs)</label><input id="expense-tax" v-model.number="form.tax" type="number" min="0" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="expense-reference" style="display:block; font-size:12px; margin-bottom:4px;">Reference No</label><input id="expense-reference" v-model="form.referenceNo" maxlength="100" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="expense-department" style="display:block; font-size:12px; margin-bottom:4px;">Department</label><input id="expense-department" v-model="form.department" maxlength="80" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div style="grid-column:span 2;"><label for="expense-remarks" style="display:block; font-size:12px; margin-bottom:4px;">Remarks</label><input id="expense-remarks" v-model="form.remarks" maxlength="1000" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div class="card" style="background:var(--color-accent-soft); border:none;"><span>Total Paid: </span><strong class="kpi-value">{{ fmt(totalPaid) }}</strong></div>
      <div style="grid-column:span 3;"><div v-if="formError" style="color:var(--color-danger); font-size:13px; margin-bottom:8px;">{{ formError }}</div><button type="submit" :disabled="submitting" style="padding:10px 16px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;">{{ submitting ? 'Saving…' : 'Save Expense' }}</button></div>
    </form>
    <div style="overflow-x:auto;"><table style="width:100%; min-width:1450px; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid var(--color-border);"><th style="padding:8px;">Date</th><th style="padding:8px;">Expense No</th><th style="padding:8px;">Category</th><th style="padding:8px;">Description</th><th style="padding:8px;">Payment Mode</th><th style="padding:8px;">Reference No</th><th style="padding:8px;">Department</th><th style="padding:8px;">Approved By</th><th style="padding:8px;">Status</th><th style="padding:8px;">Tax</th><th style="padding:8px;">Total Paid (Rs)</th><th style="padding:8px;">Remarks</th><th style="padding:8px;">Entered By</th></tr></thead><tbody><tr v-for="expense in expenseList" :key="expense.id" style="border-bottom:1px solid var(--color-border);"><td style="padding:8px;">{{ expense.expenseDate }}</td><td style="padding:8px;">{{ expense.expenseNo }}</td><td style="padding:8px;">{{ expense.category }}</td><td style="padding:8px;">{{ expense.description || '—' }}</td><td style="padding:8px;">{{ expense.paymentMode || '—' }}</td><td style="padding:8px;">{{ expense.referenceNo || '—' }}</td><td style="padding:8px;">{{ expense.department || '—' }}</td><td style="padding:8px;">{{ expense.approvedByName || '—' }}</td><td style="padding:8px;">{{ expense.status }}</td><td style="padding:8px;">{{ fmt(expense.tax) }}</td><td style="padding:8px;">{{ fmt(Number(expense.amount) + Number(expense.tax)) }}</td><td style="padding:8px;">{{ expense.remarks || '—' }}</td><td style="padding:8px;">{{ expense.enteredByName || '—' }}</td></tr></tbody></table></div>
  </div>
</template>
