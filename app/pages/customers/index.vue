<script setup lang="ts">
interface Customer { id: string; code: string; name: string; company: string | null; phone: string | null; email: string | null; gstin: string | null; address: string | null; city: string | null; state: string | null; pinCode: string | null; openingBalance: string; creditLimit: string | null; status: string; createdAt: string; lastTransaction: string | null; remarks: string | null; assignedToName: string | null }
const { data: customersList, refresh } = await useFetch<Customer[]>('/api/customers')
const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const form = reactive({ name: '', company: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pinCode: '', openingBalance: 0, creditLimit: 0, status: 'active' as 'active' | 'inactive', remarks: '' })
function fmt(value: string | number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) }
function dateOnly(value: string) { return value.slice(0, 10) }
async function submit() {
  formError.value = ''; submitting.value = true
  try {
    const body = { ...form, company: form.company || undefined, phone: form.phone || undefined, email: form.email || undefined, gstin: form.gstin || undefined, address: form.address || undefined, city: form.city || undefined, state: form.state || undefined, pinCode: form.pinCode || undefined, creditLimit: form.creditLimit || undefined, remarks: form.remarks || undefined }
    if (editingId.value) {
      const { openingBalance: _openingBalance, ...updateBody } = body
      await $fetch(`/api/customers/${editingId.value}`, { method: 'PATCH', body: updateBody })
    } else await $fetch('/api/customers', { method: 'POST', body })
    showForm.value = false
    editingId.value = null
    Object.assign(form, { name: '', company: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pinCode: '', openingBalance: 0, creditLimit: 0, status: 'active', remarks: '' })
    await refresh()
  } catch (error: any) { formError.value = error?.data?.data?.formErrors?.[0] || error?.data?.statusMessage || 'Could not save customer' }
  finally { submitting.value = false }
}
function startEdit(customer: Customer) {
  editingId.value = customer.id
  Object.assign(form, { name: customer.name, company: customer.company || '', phone: customer.phone || '', email: customer.email || '', gstin: customer.gstin || '', address: customer.address || '', city: customer.city || '', state: customer.state || '', pinCode: customer.pinCode || '', openingBalance: Number(customer.openingBalance), creditLimit: Number(customer.creditLimit || 0), status: customer.status, remarks: customer.remarks || '' })
  showForm.value = true
}
</script>

<template>
  <div>
    <div v-if="customersList?.length" class="card" style="margin-bottom:12px; display:flex; gap:8px; align-items:center;">
      <label for="customer-edit-select" style="font-size:12px;">Edit Master</label>
      <select id="customer-edit-select" @change="startEdit(customersList.find((customer) => customer.id === ($event.target as HTMLSelectElement).value)!)">
        <option value="">Select customer by name — ID</option>
        <option v-for="customer in customersList" :key="customer.id" :value="customer.id">{{ customer.name }} — {{ customer.code }}</option>
      </select>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><div><h1 style="font-size:20px; margin:0;">Customer Master</h1><p style="margin:4px 0 0; color:var(--color-text-muted); font-size:13px;">One permanent record per customer. Transactions belong in Customer Ledger.</p></div><div style="display:flex; gap:8px;"><NuxtLink to="/customer-ledger" style="padding:8px 14px; border:1px solid var(--color-border); border-radius:6px; text-decoration:none;">Customer Ledger</NuxtLink><button style="padding:8px 14px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;" @click="showForm = !showForm">{{ showForm ? 'Cancel' : '+ New Customer' }}</button></div></div>
    <form v-if="showForm" class="card" style="margin-bottom:20px; display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;" @submit.prevent="submit">
      <div><label for="customer-name" style="display:block; font-size:12px; margin-bottom:4px;">Customer Name</label><input id="customer-name" v-model="form.name" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-company" style="display:block; font-size:12px; margin-bottom:4px;">Company</label><input id="customer-company" v-model="form.company" maxlength="150" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-mobile" style="display:block; font-size:12px; margin-bottom:4px;">Mobile</label><input id="customer-mobile" v-model="form.phone" maxlength="20" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="customer-email" style="display:block; font-size:12px; margin-bottom:4px;">Email</label><input id="customer-email" v-model="form.email" type="email" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-gstin" style="display:block; font-size:12px; margin-bottom:4px;">GSTIN</label><input id="customer-gstin" v-model="form.gstin" maxlength="20" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-status" style="display:block; font-size:12px; margin-bottom:4px;">Status</label><select id="customer-status" v-model="form.status" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <div style="grid-column:span 3;"><label for="customer-address" style="display:block; font-size:12px; margin-bottom:4px;">Address</label><input id="customer-address" v-model="form.address" maxlength="300" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="customer-city" style="display:block; font-size:12px; margin-bottom:4px;">City</label><input id="customer-city" v-model="form.city" maxlength="80" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-state" style="display:block; font-size:12px; margin-bottom:4px;">State</label><input id="customer-state" v-model="form.state" maxlength="80" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-pin" style="display:block; font-size:12px; margin-bottom:4px;">PIN Code</label><input id="customer-pin" v-model="form.pinCode" maxlength="20" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label for="customer-opening" style="display:block; font-size:12px; margin-bottom:4px;">Opening Balance (Rs)</label><input id="customer-opening" v-model.number="form.openingBalance" type="number" min="0" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div><label for="customer-credit" style="display:block; font-size:12px; margin-bottom:4px;">Credit Limit (Rs)</label><input id="customer-credit" v-model.number="form.creditLimit" type="number" min="0" step="0.01" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div><div style="font-size:12px; color:var(--color-text-muted); align-self:end;">Assigned To is automatically set to the user creating this customer.</div>
      <div style="grid-column:span 3;"><label for="customer-remarks" style="display:block; font-size:12px; margin-bottom:4px;">Remarks</label><input id="customer-remarks" v-model="form.remarks" maxlength="1000" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div style="grid-column:span 3;"><div v-if="formError" style="color:var(--color-danger); font-size:13px; margin-bottom:8px;">{{ formError }}</div><button type="submit" :disabled="submitting" style="padding:10px 16px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;">{{ submitting ? 'Saving…' : 'Save Customer' }}</button></div>
    </form>
    <div style="overflow-x:auto;"><table style="width:100%; min-width:2000px; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid var(--color-border);"><th style="padding:8px;">Customer ID</th><th style="padding:8px;">Customer Name</th><th style="padding:8px;">Company</th><th style="padding:8px;">Mobile</th><th style="padding:8px;">Email</th><th style="padding:8px;">GSTIN</th><th style="padding:8px;">Address</th><th style="padding:8px;">City</th><th style="padding:8px;">State</th><th style="padding:8px;">PIN Code</th><th style="padding:8px;">Opening Balance (Rs)</th><th style="padding:8px;">Credit Limit (Rs)</th><th style="padding:8px;">Status</th><th style="padding:8px;">Created On</th><th style="padding:8px;">Last Transaction</th><th style="padding:8px;">Remarks</th><th style="padding:8px;">Assigned To</th><th style="padding:8px;">Customer Ledger</th></tr></thead><tbody><tr v-for="customer in customersList" :key="customer.id" style="border-bottom:1px solid var(--color-border);"><td style="padding:8px;">{{ customer.code }}</td><td style="padding:8px;">{{ customer.name }}</td><td style="padding:8px;">{{ customer.company || '—' }}</td><td style="padding:8px;">{{ customer.phone || '—' }}</td><td style="padding:8px;">{{ customer.email || '—' }}</td><td style="padding:8px;">{{ customer.gstin || '—' }}</td><td style="padding:8px;">{{ customer.address || '—' }}</td><td style="padding:8px;">{{ customer.city || '—' }}</td><td style="padding:8px;">{{ customer.state || '—' }}</td><td style="padding:8px;">{{ customer.pinCode || '—' }}</td><td style="padding:8px;">{{ fmt(customer.openingBalance) }}</td><td style="padding:8px;">{{ customer.creditLimit ? fmt(customer.creditLimit) : '—' }}</td><td style="padding:8px;">{{ customer.status }}</td><td style="padding:8px;">{{ dateOnly(customer.createdAt) }}</td><td style="padding:8px;">{{ customer.lastTransaction || '—' }}</td><td style="padding:8px;">{{ customer.remarks || '—' }}</td><td style="padding:8px;">{{ customer.assignedToName || '—' }}</td><td style="padding:8px;"><NuxtLink :to="`/customers/${customer.id}`">View Ledger →</NuxtLink></td></tr></tbody></table></div>
  </div>
</template>
<style scoped>table th:last-child, table td:last-child { display: none; }</style>
