<script setup lang="ts">
defineProps<{
  label: string
  value: number
  format?: 'currency' | 'number'
  tone?: 'default' | 'danger'
}>()

function formatValue(value: number, format?: string) {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  }
  return new Intl.NumberFormat('en-IN').format(value)
}
</script>

<template>
  <div class="card">
    <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px;">{{ label }}</div>
    <div
      class="kpi-value"
      :style="{ fontSize: '22px', fontWeight: 700, color: tone === 'danger' ? 'var(--color-danger)' : 'var(--color-text)' }"
    >
      {{ formatValue(value, format) }}
    </div>
  </div>
</template>
