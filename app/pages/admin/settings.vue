<script setup lang="ts">
interface BusinessProfile {
  id: string; businessName: string; financialYearStart: string; financialYearEnd: string; gstRegistered: boolean; gstin: string | null; address: string | null
  phone: string | null; email: string | null; city: string | null; state: string | null; pinCode: string | null; currency: string; timezone: string; invoicePrefix: string; purchasePrefix: string; defaultWarehouse: string
}

const { data: profile, error, refresh } = await useFetch<BusinessProfile>('/api/admin/business-profile')
const submitting = ref(false)
const formError = ref('')
const saved = ref(false)
const form = reactive({ businessName: '', financialYearStart: '', financialYearEnd: '', gstRegistered: false, gstin: '', address: '', phone: '', email: '', city: '', state: '', pinCode: '', currency: 'INR', timezone: 'Asia/Kolkata', invoicePrefix: 'INV-', purchasePrefix: 'PUR-', defaultWarehouse: 'Main' })

watchEffect(() => {
  if (profile.value) Object.assign(form, { ...profile.value, gstin: profile.value.gstin ?? '', address: profile.value.address ?? '', phone: profile.value.phone ?? '', email: profile.value.email ?? '', city: profile.value.city ?? '', state: profile.value.state ?? '', pinCode: profile.value.pinCode ?? '' })
})

async function submit() {
  formError.value = ''; saved.value = false; submitting.value = true
  try {
    await $fetch('/api/admin/business-profile', { method: 'PATCH', body: { ...form, gstin: form.gstRegistered ? form.gstin : undefined } })
    saved.value = true
    await refresh()
  } catch (requestError: any) {
    formError.value = requestError?.data?.data?.fieldErrors?.gstin?.[0] || requestError?.data?.data?.fieldErrors?.email?.[0] || requestError?.data?.statusMessage || 'Could not save settings'
  } finally { submitting.value = false }
}
</script>

<template>
  <div class="settings-page">
    <header><div><h1>Business Settings</h1><p>Owner-only configuration used by documents, reports, and operational workflows.</p></div><NuxtLink class="secondary-link" to="/reports/data-quality">Run Data Quality Review</NuxtLink></header>
    <div v-if="error" class="card error">{{ error.statusMessage || 'Could not load business profile.' }}</div>
    <form v-else class="settings-form" @submit.prevent="submit">
      <section class="card"><h2>Business Identity</h2><p class="section-help">Shown on reports, invoices, and business documents.</p><div class="field-grid"><label>Business Name<input v-model="form.businessName" required maxlength="150"></label><label>Phone<input v-model="form.phone" maxlength="30"></label><label>Email<input v-model="form.email" type="email" maxlength="150"></label><label class="wide">Address<textarea v-model="form.address" maxlength="300" rows="2"></textarea></label><label>City<input v-model="form.city" maxlength="80"></label><label>State<input v-model="form.state" maxlength="80"></label><label>PIN Code<input v-model="form.pinCode" maxlength="12"></label></div></section>
      <section class="card"><h2>Financial Year &amp; Tax</h2><p class="section-help">These settings control report periods and tax presentation.</p><div class="field-grid"><label>Financial Year Start<input v-model="form.financialYearStart" type="date" required></label><label>Financial Year End<input v-model="form.financialYearEnd" type="date" required></label><label>Currency<select v-model="form.currency"><option value="INR">Indian Rupee (INR)</option><option value="USD">US Dollar (USD)</option><option value="EUR">Euro (EUR)</option><option value="GBP">Pound Sterling (GBP)</option></select></label><label>Timezone<input v-model="form.timezone" required maxlength="80"></label><label class="wide check"><input v-model="form.gstRegistered" type="checkbox"> GST Registered</label><label v-if="form.gstRegistered">GSTIN<input v-model="form.gstin" required maxlength="20"></label></div></section>
      <section class="card"><h2>Document &amp; Inventory Defaults</h2><p class="section-help">Defaults reduce data-entry errors. Existing document numbers are never changed.</p><div class="field-grid"><label>Sales Invoice Prefix<input v-model="form.invoicePrefix" required maxlength="20" pattern="[A-Z0-9-]+"></label><label>Purchase Prefix<input v-model="form.purchasePrefix" required maxlength="20" pattern="[A-Z0-9-]+"></label><label>Default Warehouse<input v-model="form.defaultWarehouse" required maxlength="100"></label></div></section>
      <div class="form-footer"><span v-if="formError" class="error-text">{{ formError }}</span><span v-if="saved" class="saved-text">Settings saved successfully.</span><button type="submit" :disabled="submitting">{{ submitting ? 'Saving…' : 'Save Settings' }}</button></div>
    </form>
  </div>
</template>

<style scoped>
.settings-page { max-width: 900px; }header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }h1 { margin: 0; font-size: 24px; }h2 { margin: 0; font-size: 17px; }.settings-page header p, .section-help { margin: 6px 0 0; color: var(--color-text-muted); font-size: 13px; }.secondary-link { color: var(--color-accent); font-size: 13px; }.settings-form { display: grid; gap: 16px; }.card { padding: 18px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }.field-grid label { display: grid; gap: 5px; color: var(--color-text-muted); font-size: 12px; }.field-grid input, .field-grid textarea, .field-grid select { box-sizing: border-box; width: 100%; padding: 9px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-background); color: var(--color-text); font: inherit; }.wide { grid-column: 1 / -1; }.check { display: flex !important; grid-template-columns: auto 1fr; align-items: center; gap: 8px !important; }.check input { width: auto; }.form-footer { display: flex; align-items: center; gap: 12px; }.form-footer button { padding: 10px 17px; border: 0; border-radius: 6px; background: var(--color-accent); color: white; cursor: pointer; }.form-footer button:disabled { cursor: wait; opacity: .6; }.error, .error-text { color: var(--color-danger); }.saved-text { color: var(--color-accent); }.error { border-color: var(--color-danger); }
@media (max-width: 640px) { header { flex-direction: column; }.field-grid { grid-template-columns: 1fr; }.wide { grid-column: auto; }.form-footer { align-items: flex-start; flex-direction: column; } }
</style>
