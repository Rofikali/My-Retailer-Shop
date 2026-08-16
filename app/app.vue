<script setup lang="ts">
const { user, logout } = useAuth()
const route = useRoute()
const isSidebarCollapsed = ref(false)

onMounted(() => {
  isSidebarCollapsed.value = localStorage.getItem('retailshop.sidebar.collapsed') === 'true'
})

watch(isSidebarCollapsed, (collapsed) => {
  localStorage.setItem('retailshop.sidebar.collapsed', String(collapsed))
})

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/cashbook', label: 'Cash Book' },
  { to: '/sales', label: 'Sales' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/customers', label: 'Customers' },
  { to: '/customer-ledger', label: 'Customer Ledger' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/supplier-ledger', label: 'Supplier Ledger' },
  { to: '/journal', label: 'Journal' },
  { to: '/general-ledger', label: 'General Ledger' },
  { to: '/party-ledger', label: 'Receipts & Payments' },
  { to: '/reports/trial-balance', label: 'Reports' },
  { to: '/reports/cash-flow', label: 'Cash Flow Statement' },
  { to: '/reports/profit-and-loss', label: 'Profit & Loss' },
  { to: '/admin/ledger-entries', label: 'Ledger Audit' },
  { to: '/admin/users', label: 'Admin' },
  { to: '/admin/settings', label: 'Settings' }
]
</script>

<template>
  <div v-if="route.path === '/login'">
    <NuxtPage />
  </div>
  <div v-else class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar--collapsed': isSidebarCollapsed }">
      <div class="sidebar__header">
        <span v-show="!isSidebarCollapsed" class="sidebar__brand">RetailShop ERP</span>
        <button
          class="sidebar__toggle"
          type="button"
          :aria-label="isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'"
          :aria-expanded="!isSidebarCollapsed"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      <nav class="sidebar__nav" aria-label="Primary navigation">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar__link"
          :title="isSidebarCollapsed ? item.label : undefined"
          active-class="nav-active"
        >
          <span v-if="isSidebarCollapsed" class="sidebar__initial" aria-hidden="true">{{ item.label.charAt(0) }}</span>
          <span v-else>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar__footer">
        <div v-if="user && !isSidebarCollapsed">{{ user.name }} · {{ user.role }}</div>
        <button class="sidebar__logout" type="button" :title="isSidebarCollapsed ? 'Log out' : undefined" @click="logout">
          <span v-if="isSidebarCollapsed" aria-hidden="true">↪</span>
          <span v-else>Log out</span>
        </button>
      </div>
    </aside>

    <main class="app-content">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
.app-shell { display: flex; min-height: 100vh; }
.sidebar { display: flex; position: sticky; top: 0; flex-direction: column; width: 220px; height: 100vh; padding: 16px; background: var(--color-surface); border-right: 1px solid var(--color-border); transition: width 160ms ease, padding 160ms ease; }
.sidebar--collapsed { width: 64px; padding: 16px 8px; }
.sidebar__header { display: flex; align-items: center; justify-content: space-between; min-height: 32px; margin-bottom: 24px; }
.sidebar__brand { overflow: hidden; font-weight: 700; white-space: nowrap; }
.sidebar__toggle, .sidebar__logout { border: 0; background: transparent; color: var(--color-text); cursor: pointer; }
.sidebar__toggle { display: grid; width: 32px; height: 32px; padding: 0; border-radius: 6px; place-items: center; font-size: 18px; }
.sidebar__toggle:hover, .sidebar__logout:hover { background: var(--color-accent-soft); color: var(--color-accent); }
.sidebar__nav { display: flex; flex-direction: column; gap: 4px; }
.sidebar__link { display: flex; min-height: 36px; align-items: center; padding: 8px 10px; border-radius: 6px; color: var(--color-text); text-decoration: none; }
.sidebar--collapsed .sidebar__link { justify-content: center; padding: 8px; }
.sidebar__initial { font-size: 12px; font-weight: 700; }
.sidebar__footer { margin-top: auto; font-size: 12px; color: var(--color-text-muted); }
.sidebar__logout { margin-top: 8px; padding: 6px 0; color: var(--color-accent); }
.sidebar--collapsed .sidebar__logout { display: grid; width: 36px; padding: 6px; place-items: center; }
.app-content { flex: 1; min-width: 0; padding: 24px; }
.nav-active { background: var(--color-accent-soft); color: var(--color-accent) !important; font-weight: 600; }

@media (max-width: 640px) {
  .sidebar { width: 64px; padding: 16px 8px; }
  .sidebar__brand, .sidebar__link > span:last-child, .sidebar__footer > div, .sidebar__logout > span:last-child { display: none; }
  .sidebar__link { justify-content: center; padding: 8px; }
  .app-content { padding: 16px; }
}
</style>
