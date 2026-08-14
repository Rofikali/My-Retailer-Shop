interface SessionUser {
  id: string
  name: string
  email: string
  role: 'owner' | 'staff' | 'accountant_readonly'
}

export function useAuth() {
  const user = useState<SessionUser | null>('auth-user', () => null)

  async function fetchUser() {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<{ user: SessionUser }>('/api/auth/me', { headers })
      user.value = res.user
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string) {
    const res = await $fetch<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    user.value = res.user
    return res.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, fetchUser, login, logout }
}
