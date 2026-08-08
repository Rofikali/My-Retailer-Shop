<script setup lang="ts">
interface Customer {
  id: string
  code: string
  name: string
  phone: string | null
  email: string | null
  creditLimit: string | null
  status: string
}

const { data: customersList, refresh } = await useFetch<Customer[]>('/api/customers')

const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = reactive({ name: '', phone: '', email: '', address: '' })

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch('/api/customers', { method: 'POST', body: { ...form } })
    showForm.value = false
    form.name = ''; form.phone = ''; form.email = ''; form.address = ''
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || 'Could not save customer'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="font-size: 20px; margin: 0;">Customers</h1>
      <button style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New Customer' }}
      </button>
    </div>

    <form v-if="showForm" class="card" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;" @submit.prevent="submit">
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Name</label>
        <input v-model="form.name" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Phone</label>
        <input v-model="form.phone" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Email</label>
        <input v-model="form.email" type="email" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Address</label>
        <input v-model="form.address" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div style="grid-column: span 2;">
        <div v-if="formError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ formError }}</div>
        <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
          {{ submitting ? 'Saving…' : 'Save Customer' }}
        </button>
      </div>
    </form>

    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Code</th><th style="padding: 8px;">Name</th>
          <th style="padding: 8px;">Phone</th><th style="padding: 8px;">Status</th><th style="padding: 8px;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in customersList" :key="c.id" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ c.code }}</td>
          <td style="padding: 8px;">{{ c.name }}</td>
          <td style="padding: 8px;">{{ c.phone || '—' }}</td>
          <td style="padding: 8px;">{{ c.status }}</td>
          <td style="padding: 8px;"><NuxtLink :to="`/customers/${c.id}`">View ledger →</NuxtLink></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
