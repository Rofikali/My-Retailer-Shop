<script setup lang="ts">
interface Party { id: string; code: string; name: string }

const partyType = ref<'customer' | 'supplier'>('customer')
const { data: customers } = await useFetch<Party[]>('/api/customers')
const { data: suppliers } = await useFetch<Party[]>('/api/suppliers')
const submitting = ref(false)
const message = ref('')
const errorMessage = ref('')
const form = reactive({ partyId: '', entryDate: new Date().toISOString().slice(0, 10), amount: 0, paymentMode: 'cash', referenceNo: '', remarks: '' })
const parties = computed(() => partyType.value === 'customer' ? customers.value || [] : suppliers.value || [])

watch(partyType, () => { form.partyId = '' })

async function submit() {
  message.value = ''
  errorMessage.value = ''
  submitting.value = true
  try {
    const result = await $fetch<{ voucherNo: string }>('/api/party-ledger/payments', {
      method: 'POST', body: { ...form, partyType: partyType.value }
    })
    message.value = `${result.voucherNo} posted successfully.`
    form.amount = 0
    form.referenceNo = ''
    form.remarks = ''
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Could not post the entry.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <h1 style="font-size:20px; margin-bottom:4px;">Party Receipt / Payment</h1>
    <p style="color:var(--color-text-muted); margin:0 0 20px;">Choose an existing master. Posted entries are corrected through reversal, not direct editing.</p>
    <form class="card" style="max-width:720px; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;" @submit.prevent="submit">
      <label>Entry type<select v-model="partyType"><option value="customer">Customer receipt</option><option value="supplier">Supplier payment</option></select></label>
      <label>{{ partyType === 'customer' ? 'Customer' : 'Supplier' }}<select v-model="form.partyId" required><option value="" disabled>Select a master</option><option v-for="party in parties" :key="party.id" :value="party.id">{{ party.name }} — {{ party.code }}</option></select></label>
      <label>Date<input v-model="form.entryDate" type="date" required></label>
      <label>Amount (Rs)<input v-model.number="form.amount" type="number" min="0.01" step="0.01" required></label>
      <label>Payment mode<select v-model="form.paymentMode"><option value="cash">Cash</option><option value="upi">UPI</option></select></label>
      <label>Reference No<input v-model="form.referenceNo" maxlength="100"></label>
      <label style="grid-column:1 / -1;">Remarks<textarea v-model="form.remarks" rows="3" maxlength="1000"></textarea></label>
      <div style="grid-column:1 / -1;"><div v-if="errorMessage" style="color:var(--color-danger); margin-bottom:8px;">{{ errorMessage }}</div><div v-if="message" style="color:var(--color-accent); margin-bottom:8px;">{{ message }}</div><button type="submit" :disabled="submitting">{{ submitting ? 'Posting…' : 'Post Entry' }}</button></div>
    </form>
  </div>
</template>

<style scoped>
label { display:block; font-size:12px; } input, select, textarea { display:block; width:100%; margin-top:4px; padding:8px; border:1px solid var(--color-border); border-radius:6px; } button { padding:10px 16px; background:var(--color-accent); color:white; border:0; border-radius:6px; cursor:pointer; }
</style>
