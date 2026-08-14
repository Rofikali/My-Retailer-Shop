<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
    <form class="card" style="width: 320px;" @submit.prevent="handleSubmit">
      <h1 style="font-size: 18px; margin: 0 0 16px;">RetailShop ERP</h1>
      <label for="email" style="display: block; font-size: 12px; margin-bottom: 4px;">Email</label>
      <input id="email" v-model="email" type="email" required style="width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid var(--color-border); border-radius: 6px;">
      <label for="password" style="display: block; font-size: 12px; margin-bottom: 4px;">Password</label>
      <input id="password" v-model="password" type="password" required style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid var(--color-border); border-radius: 6px;">
      <div v-if="error" style="color: var(--color-danger); font-size: 13px; margin-bottom: 12px;">{{ error }}</div>
      <button
        type="submit"
        :disabled="loading"
        style="width: 100%; padding: 10px; background: var(--color-accent); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;"
      >
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
