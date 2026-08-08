<script setup lang="ts">
interface BusinessProfile {
  id: string
  businessName: string
  financialYearStart: string
  financialYearEnd: string
  gstRegistered: boolean
  gstin: string | null
  address: string | null
}

const { data: profile, error, refresh } = await useFetch<BusinessProfile>('/api/admin/business-profile')

const submitting = ref(false)
const formError = ref('')
const saved = ref(false)

const form = reactive({
  businessName: '', financialYearStart: '', financialYearEnd: '',
  gstRegistered: false, gstin: '', address: ''
})

watchEffect(() => {
  if (profile.value) {
    form.businessName = profile.value.businessName
    form.financialYearStart = profile.value.financialYearStart
    form.financialYearEnd = profile.value.financialYearEnd
    form.gstRegistered = profile.value.gstRegistered
    form.gstin = profile.value.gstin ?? ''
    form.address = profile.value.address ?? ''
  }
})

async function submit() {
  formError.value = ''
  saved.value = false
  submitting.value = true
  try {
    await $fetch('/api/admin/business-profile', {
      method: 'PATCH',
      body: {
        businessName: form.businessName,
        financialYearStart: form.financialYearStart,
        financialYearEnd: form.financialYearEnd,
        gstRegistered: form.gstRegistered,
        gstin: form.gstRegistered ? form.gstin : undefined,
        address: form.address || undefined
      }
    })
    saved.value = true
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.data?.fieldErrors?.gstin?.[0] || e?.data?.statusMessage || 'Could not save settings'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 4px;">Business Settings</h1>
    <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 20px;">Owner-only.</p>

    <div v-if="error" class="card" style="border-color: var(--color-danger); max-width: 480px;">
      {{ error.statusMessage || 'Could not load business profile.' }}
    </div>

    <form v-else class="card" style="max-width: 480px; display: grid; gap: 12px;" @submit.prevent="submit">
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Business Name</label>
        <input v-model="form.businessName" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <label style="display:block; font-size:12px; margin-bottom:4px;">Financial Year Start</label>
          <input v-model="form.financialYearStart" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
        <div>
          <label style="display:block; font-size:12px; margin-bottom:4px;">Financial Year End</label>
          <input v-model="form.financialYearEnd" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
      </div>
      <div>
        <label style="display:flex; align-items:center; gap:8px; font-size:13px;">
          <input v-model="form.gstRegistered" type="checkbox">
          GST Registered
        </label>
      </div>
      <div v-if="form.gstRegistered">
        <label style="display:block; font-size:12px; margin-bottom:4px;">GSTIN</label>
        <input v-model="form.gstin" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Address</label>
        <input v-model="form.address" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>

      <div v-if="formError" style="color: var(--color-danger); font-size: 13px;">{{ formError }}</div>
      <div v-if="saved" style="color: var(--color-accent); font-size: 13px;">Saved.</div>
      <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer; width: fit-content;">
        {{ submitting ? 'Saving…' : 'Save Settings' }}
      </button>
    </form>
  </div>
</template>
