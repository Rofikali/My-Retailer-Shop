<script setup lang="ts">
interface AdminUser {
  id: string
  name: string
  email: string
  role: 'owner' | 'staff' | 'accountant_readonly'
  isActive: boolean
}

const { user: currentUser, fetchUser } = useAuth()
const { data: userList, refresh, error } = await useFetch<AdminUser[]>('/api/admin/users')

const showForm = ref(false)
const editingUser = ref<AdminUser | null>(null)
const submitting = ref(false)
const formError = ref('')
const form = reactive({ name: '', email: '', password: '', currentPassword: '', role: 'staff' as AdminUser['role'] })

function resetForm() {
  form.name = ''
  form.email = ''
  form.password = ''
  form.currentPassword = ''
  form.role = 'staff'
}

function openCreate() {
  editingUser.value = null
  resetForm()
  formError.value = ''
  showForm.value = true
}

function openEdit(account: AdminUser) {
  editingUser.value = account
  form.name = account.name
  form.email = account.email
  form.password = ''
  form.currentPassword = ''
  form.role = account.role
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingUser.value = null
  resetForm()
  formError.value = ''
}

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    if (editingUser.value) {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
        ...(form.currentPassword ? { currentPassword: form.currentPassword } : {})
      }
      await $fetch(`/api/admin/users/${editingUser.value.id}`, { method: 'PATCH', body: payload })
      if (editingUser.value.id === currentUser.value?.id) await fetchUser()
    } else {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: { name: form.name, email: form.email, password: form.password, role: form.role }
      })
    }
    closeForm()
    await refresh()
  } catch (error: any) {
    formError.value = error?.data?.statusMessage || 'Could not save this account'
  } finally {
    submitting.value = false
  }
}

async function toggleActive(account: AdminUser) {
  formError.value = ''
  try {
    await $fetch(`/api/admin/users/${account.id}/active`, { method: 'PATCH', body: { isActive: !account.isActive } })
    await refresh()
  } catch (error: any) {
    formError.value = error?.data?.statusMessage || 'Could not update account status'
  }
}

const editingSelf = computed(() => editingUser.value?.id === currentUser.value?.id)
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 4px;">User Management</h1>
    <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 20px;">
      Owner-only. Manage access without changing financial records.
    </p>

    <div v-if="error" class="card" style="border-color: var(--color-danger);">
      {{ error.statusMessage || 'You do not have permission to view this page.' }}
    </div>

    <template v-else>
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <button style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;" @click="openCreate">
          + New User
        </button>
        <span v-if="formError && !showForm" style="color: var(--color-danger); font-size: 13px;">{{ formError }}</span>
      </div>

      <form v-if="showForm" class="card" style="margin-bottom:20px; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;" @submit.prevent="submit">
        <h2 style="grid-column:span 2; font-size:16px; margin:0;">{{ editingUser ? 'Edit User' : 'Create User' }}</h2>
        <div>
          <label for="user-name" style="display:block; font-size:12px; margin-bottom:4px;">Full name</label>
          <input id="user-name" v-model.trim="form.name" required maxlength="100" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
        <div>
          <label for="user-email" style="display:block; font-size:12px; margin-bottom:4px;">Email (sign-in username)</label>
          <input id="user-email" v-model.trim="form.email" type="email" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
        <div>
          <label for="user-password" style="display:block; font-size:12px; margin-bottom:4px;">{{ editingUser ? 'New password (optional)' : 'Temporary password' }}</label>
          <input id="user-password" v-model="form.password" type="password" :required="!editingUser" minlength="12" autocomplete="new-password" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <small style="color:var(--color-text-muted);">12+ characters, uppercase, lowercase, and number.</small>
        </div>
        <div v-if="editingSelf">
          <label for="current-password" style="display:block; font-size:12px; margin-bottom:4px;">Current password</label>
          <input id="current-password" v-model="form.currentPassword" type="password" autocomplete="current-password" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <small style="color:var(--color-text-muted);">Required when changing your email or password.</small>
        </div>
        <div>
          <label for="user-role" style="display:block; font-size:12px; margin-bottom:4px;">Role</label>
          <select id="user-role" v-model="form.role" :disabled="editingSelf" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
            <option value="staff">Staff - record transactions</option>
            <option value="accountant_readonly">Accountant - read-only reports</option>
            <option value="owner">Owner - full access</option>
          </select>
          <small v-if="editingSelf" style="color:var(--color-text-muted);">Your own role cannot be changed here.</small>
        </div>
        <div style="grid-column:span 2; display:flex; align-items:center; gap:10px;">
          <button type="submit" :disabled="submitting" style="padding:10px 16px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;">
            {{ submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User' }}
          </button>
          <button type="button" style="padding:10px 16px; background:none; border:1px solid var(--color-border); border-radius:6px; cursor:pointer;" @click="closeForm">Cancel</button>
          <span v-if="formError" style="color:var(--color-danger); font-size:13px;">{{ formError }}</span>
        </div>
      </form>

      <div class="card" style="overflow-x:auto; padding:0;">
        <table style="width:100%; border-collapse:collapse; min-width:720px;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid var(--color-border);">
              <th style="padding:12px 8px;">Name</th><th style="padding:12px 8px;">Email</th>
              <th style="padding:12px 8px;">Role</th><th style="padding:12px 8px;">Status</th><th style="padding:12px 8px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in userList" :key="account.id" style="border-bottom:1px solid var(--color-border);">
              <td style="padding:10px 8px;">{{ account.name }} <small v-if="account.id === currentUser?.id" style="color:var(--color-text-muted);">(you)</small></td>
              <td style="padding:10px 8px;">{{ account.email }}</td>
              <td style="padding:10px 8px;">{{ account.role }}</td>
              <td style="padding:10px 8px;">{{ account.isActive ? 'Active' : 'Disabled' }}</td>
              <td style="padding:10px 8px; display:flex; gap:8px;">
                <button style="background:none; border:1px solid var(--color-border); border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;" @click="openEdit(account)">Edit</button>
                <button v-if="account.id !== currentUser?.id" style="background:none; border:1px solid var(--color-border); border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;" @click="toggleActive(account)">
                  {{ account.isActive ? 'Disable' : 'Enable' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
