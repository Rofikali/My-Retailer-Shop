<script setup lang="ts">
interface StockRow {
  id: string
  code: string
  name: string
  category: string | null
  unit: string | null
  reorderLevel: string
  costPrice: string | null
  sellingPrice: string | null
  currentStock: number
  stockValue: number
  status: string
}

const { data: stock, refresh } = await useFetch<StockRow[]>('/api/inventory')

// --- Add Product ---
const showProductForm = ref(false)
const productSubmitting = ref(false)
const productError = ref('')
const productForm = reactive({ name: '', category: '', unit: '', reorderLevel: 0, costPrice: 0, sellingPrice: 0 })

async function submitProduct() {
  productError.value = ''
  productSubmitting.value = true
  try {
    await $fetch('/api/products', { method: 'POST', body: { ...productForm } })
    showProductForm.value = false
    productForm.name = ''; productForm.category = ''; productForm.unit = ''
    productForm.reorderLevel = 0; productForm.costPrice = 0; productForm.sellingPrice = 0
    await refresh()
  } catch (e: any) {
    productError.value = e?.data?.statusMessage || 'Could not save product'
  } finally {
    productSubmitting.value = false
  }
}

// --- Stock Adjustment (opening / damage / correction) ---
const showAdjustForm = ref(false)
const adjustSubmitting = ref(false)
const adjustError = ref('')
const adjustForm = reactive({
  productId: '',
  adjustmentDate: new Date().toISOString().slice(0, 10),
  reason: 'opening' as 'opening' | 'damage' | 'correction',
  quantity: 0,
  remarks: ''
})

async function submitAdjustment() {
  adjustError.value = ''
  adjustSubmitting.value = true
  try {
    await $fetch('/api/inventory/adjust', { method: 'POST', body: { ...adjustForm } })
    showAdjustForm.value = false
    adjustForm.quantity = 0
    adjustForm.remarks = ''
    await refresh()
  } catch (e: any) {
    adjustError.value = e?.data?.data?.fieldErrors?.quantity?.[0] || e?.data?.statusMessage || 'Could not save adjustment'
  } finally {
    adjustSubmitting.value = false
  }
}

function fmt(v: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="font-size: 20px; margin: 0;">Inventory</h1>
      <div style="display: flex; gap: 8px;">
        <button style="padding: 8px 14px; background: white; color: var(--color-accent); border: 1px solid var(--color-accent); border-radius: 6px; cursor: pointer;" @click="showAdjustForm = !showAdjustForm; showProductForm = false">
          {{ showAdjustForm ? 'Cancel' : 'Stock Adjustment' }}
        </button>
        <button style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;" @click="showProductForm = !showProductForm; showAdjustForm = false">
          {{ showProductForm ? 'Cancel' : '+ New Product' }}
        </button>
      </div>
    </div>

    <form v-if="showProductForm" class="card" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;" @submit.prevent="submitProduct">
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Name</label>
        <input v-model="productForm.name" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Category</label>
        <input v-model="productForm.category" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Unit</label>
        <input v-model="productForm.unit" placeholder="Kg, Packet, Bottle..." style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Reorder Level</label>
        <input v-model.number="productForm.reorderLevel" type="number" min="0" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Cost Price (Rs)</label>
        <input v-model.number="productForm.costPrice" type="number" min="0" step="0.01" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div><label style="display:block; font-size:12px; margin-bottom:4px;">Selling Price (Rs)</label>
        <input v-model.number="productForm.sellingPrice" type="number" min="0" step="0.01" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      <div style="grid-column: span 3;">
        <div v-if="productError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ productError }}</div>
        <button type="submit" :disabled="productSubmitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
          {{ productSubmitting ? 'Saving…' : 'Save Product' }}
        </button>
        <span style="font-size: 12px; color: var(--color-text-muted); margin-left: 12px;">
          Creating a product sets its master data only — 0 stock until you record an opening balance via Stock Adjustment.
        </span>
      </div>
    </form>

    <form v-if="showAdjustForm" class="card" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;" @submit.prevent="submitAdjustment">
      <div style="grid-column: span 2;">
        <label style="display:block; font-size:12px; margin-bottom:4px;">Product</label>
        <select v-model="adjustForm.productId" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option value="" disabled>Select product</option>
          <option v-for="p in stock" :key="p.id" :value="p.id">{{ p.name }} ({{ p.code }}) — current: {{ p.currentStock }}</option>
        </select>
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Date</label>
        <input v-model="adjustForm.adjustmentDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">Reason</label>
        <select v-model="adjustForm.reason" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
          <option value="opening">Opening Stock (adds value at cost, posts to Capital)</option>
          <option value="damage">Damage / Loss (posts to Business Loss expense)</option>
          <option value="correction">Count Correction (no ledger impact)</option>
        </select>
      </div>
      <div>
        <label style="display:block; font-size:12px; margin-bottom:4px;">
          Quantity {{ adjustForm.reason === 'correction' ? '(+ to add, - to remove)' : '' }}
        </label>
        <input v-model.number="adjustForm.quantity" type="number" step="0.01" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 3;">
        <label style="display:block; font-size:12px; margin-bottom:4px;">Remarks (optional)</label>
        <input v-model="adjustForm.remarks" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
      </div>
      <div style="grid-column: span 3;">
        <div v-if="adjustError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 8px;">{{ adjustError }}</div>
        <button type="submit" :disabled="adjustSubmitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
          {{ adjustSubmitting ? 'Saving…' : 'Save Adjustment' }}
        </button>
      </div>
    </form>

    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Code</th><th style="padding: 8px;">Product</th><th style="padding: 8px;">Category</th>
          <th style="padding: 8px; text-align: right;">Current Stock</th><th style="padding: 8px; text-align: right;">Reorder Level</th>
          <th style="padding: 8px; text-align: right;">Stock Value</th><th style="padding: 8px;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in stock" :key="p.id" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ p.code }}</td>
          <td style="padding: 8px;">{{ p.name }}</td>
          <td style="padding: 8px;">{{ p.category || '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ p.currentStock }} {{ p.unit }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ p.reorderLevel }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ fmt(p.stockValue) }}</td>
          <td style="padding: 8px;">
            <span :style="{ color: p.status === 'Reorder' ? 'var(--color-danger)' : 'var(--color-text)', fontWeight: p.status === 'Reorder' ? 700 : 400 }">
              {{ p.status }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
