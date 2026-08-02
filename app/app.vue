<script setup lang="ts">
const { user, logout } = useAuth()
const route = useRoute()

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/cashbook', label: 'Cash Book' },
  { to: '/sales', label: 'Sales' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/customers', label: 'Customers' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/reports/trial-balance', label: 'Reports' }
]
</script>

<template>
  <div v-if="route.path === '/login'">
    <NuxtPage />
  </div>
  <div v-else style="display: flex; min-height: 100vh;">
    <aside style="width: 220px; background: var(--color-surface); border-right: 1px solid var(--color-border); padding: 16px;">
      <div style="font-weight: 700; margin-bottom: 24px;">RetailShop ERP</div>
      <nav style="display: flex; flex-direction: column; gap: 4px;">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          style="padding: 8px 10px; border-radius: 6px; text-decoration: none; color: var(--color-text);"
          active-class="nav-active"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div style="position: absolute; bottom: 16px; font-size: 12px; color: var(--color-text-muted);">
        <div v-if="user">{{ user.name }} · {{ user.role }}</div>
        <button style="margin-top: 8px; background: none; border: none; color: var(--color-accent); cursor: pointer; padding: 0;" @click="logout">
          Log out
        </button>
      </div>
    </aside>
    <main style="flex: 1; padding: 24px;">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
.nav-active {
  background: var(--color-accent-soft);
  color: var(--color-accent) !important;
  font-weight: 600;
}
</style>
