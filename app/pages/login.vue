<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Sign in | RetailShop ERP',
  meta: [
    { name: 'description', content: 'Securely sign in to RetailShop ERP.' },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

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
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="login-brand">
        <p class="login-eyebrow">RetailShop ERP</p>
        <h1 id="login-title">Sign in to your account</h1>
        <p class="login-subtitle">Manage sales, inventory, and accounts securely.</p>
      </div>

      <form aria-label="Sign in" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" name="email" autocomplete="username" inputmode="email" required autofocus aria-describedby="login-error">
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" name="password" autocomplete="current-password" required aria-describedby="login-error">
        </div>

        <p v-if="error" id="login-error" class="login-error" role="alert" aria-live="assertive">{{ error }}</p>

        <button type="submit" :disabled="loading" :aria-busy="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; background: var(--color-background, #f8fafc); }
.login-card { width: min(100%, 380px); padding: 32px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 12px; background: var(--color-surface, #fff); box-shadow: 0 12px 32px rgb(15 23 42 / 8%); }
.login-brand { margin-bottom: 24px; }
.login-eyebrow { margin: 0 0 8px; color: var(--color-accent, #2563eb); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
h1 { margin: 0; color: var(--color-text, #0f172a); font-size: 24px; line-height: 1.2; }
.login-subtitle { margin: 8px 0 0; color: var(--color-text-muted, #64748b); font-size: 14px; line-height: 1.5; }
.field { margin-bottom: 16px; }
label { display: block; margin-bottom: 6px; color: var(--color-text, #0f172a); font-size: 13px; font-weight: 600; }
input { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid var(--color-border, #cbd5e1); border-radius: 6px; background: var(--color-surface, #fff); color: var(--color-text, #0f172a); font: inherit; }
input:focus-visible, button:focus-visible { outline: 3px solid rgb(37 99 235 / 30%); outline-offset: 2px; }
.login-error { margin: 0 0 16px; color: var(--color-danger, #b91c1c); font-size: 13px; }
button { width: 100%; padding: 11px 16px; border: 0; border-radius: 6px; background: var(--color-accent, #2563eb); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
button:disabled { cursor: wait; opacity: 0.7; }
</style>
