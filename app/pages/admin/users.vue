<script setup lang="ts">
interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

const { user: currentUser } = useAuth()
const { data: userList, refresh, error } = await useFetch<AdminUser[]>('/api/admin/users')

const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = reactive({ name: '', email: '', password: '', role: 'staff' })

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { ...form } })
    showForm.value = false
    form.name = ''; form.email = ''; form.password = ''; form.role = 'staff'
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || 'Could not create user'
  } finally {
    submitting.value = false
  }
}

async function toggleActive(u: AdminUser) {
  await $fetch(`/api/admin/users/${u.id}/active`, { method: 'PATCH', body: { isActive: !u.isActive } })
  await refresh()
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 4px;">User Management</h1>
    <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 20px;">Owner-only.</p>

    <div v-if="error" class="card" style="border-color: var(--color-danger);">
      {{ error.statusMessage || 'You do not have permission to view this page.' }}
    </div>

    <template v-else>
      <button
        style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px;"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Cancel' : '+ New User' }}
      </button>

      <form v-if="showForm" class="card" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;" @submit.prevent="submit">
        <div><label style="display:block; font-size:12px; margin-bottom:4px;">Name</label>
          <input v-model="form.name" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
        <div><label style="display:block; font-size:12px; margin-bottom:4px;">Email</label>
          <input v-model="form.email" type="email" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
        <div><label style="display:block; font-size:12px; margin-bottom:4px;">Temporary Password</label>
          <input v-model="form.password" type="password" required minlength="8" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
        <div><label style="display:block; font-size:12px; margin-bottom:4px;">Role</label>
          <select v-model="form.role" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
            <option value="staff">Staff — record transactions, no reports</option>
            <option value="accountant_readonly">Accountant (Read-only) — view reports, cannot edit</option>
            <option value="owner">Owner — full access</option>
          </select>
        </div>
        <div style="grid-column: span 2;">
          <div v-if="formError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ formError }}</div>
          <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
            {{ submitting ? 'Creating…' : 'Create User' }}
          </button>
        </div>
      </form>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
            <th style="padding: 8px;">Name</th><th style="padding: 8px;">Email</th>
            <th style="padding: 8px;">Role</th><th style="padding: 8px;">Status</th><th style="padding: 8px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in userList" :key="u.id" style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 8px;">{{ u.name }}</td>
            <td style="padding: 8px;">{{ u.email }}</td>
            <td style="padding: 8px;">{{ u.role }}</td>
            <td style="padding: 8px;">{{ u.isActive ? 'Active' : 'Disabled' }}</td>
            <td style="padding: 8px;">
              <button
                v-if="u.id !== currentUser?.id"
                style="background: none; border: 1px solid var(--color-border); border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer;"
                @click="toggleActive(u)"
              >
                {{ u.isActive ? 'Disable' : 'Enable' }}
              </button>
              <span v-else style="font-size: 12px; color: var(--color-text-muted);">(you)</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>
