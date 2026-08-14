<script setup lang="ts">
interface Purchase { id: string; purchaseNo: string; purchaseDate: string; productName: string; category: string | null; quantity: string; unitCost: string; discount: string; paymentMode: string; status: string; supplierName: string | null; warehouse: string; referenceNo: string | null; remarks: string | null; stockUpdated: boolean }
interface Product { id: string; code: string; name: string; costPrice: string | null }
interface Supplier { id: string; code: string; name: string }
interface PurchaseLine { productId: string; quantity: number; unitCost: number; discount: number }

const { data: purchaseList, refresh } = await useFetch<Purchase[]>('/api/purchases')
const { data: productList } = await useFetch<Product[]>('/api/products')
const { data: supplierList } = await useFetch<Supplier[]>('/api/suppliers')
const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const purchaseDate = ref(new Date().toISOString().slice(0, 10))
const paymentMode = ref<'cash' | 'upi' | 'credit'>('credit')
const supplierId = ref('')
const warehouse = ref('Main')
const referenceNo = ref('')
const remarks = ref('')
const lines = ref<PurchaseLine[]>([{ productId: '', quantity: 1, unitCost: 0, discount: 0 }])

function addLine() { lines.value.push({ productId: '', quantity: 1, unitCost: 0, discount: 0 }) }
function removeLine(index: number) { lines.value.splice(index, 1) }
function onProductChange(line: PurchaseLine) {
  const product = productList.value?.find((item) => item.id === line.productId)
  if (product) line.unitCost = Number(product.costPrice ?? 0)
}

const grossAmount = computed(() => lines.value.reduce((sum, line) => sum + line.quantity * line.unitCost, 0))
const totalDiscount = computed(() => lines.value.reduce((sum, line) => sum + line.discount, 0))
const totalAmount = computed(() => grossAmount.value - totalDiscount.value)
const lineNet = (line: PurchaseLine) => line.quantity * line.unitCost - line.discount
function fmt(value: number | string) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) }

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch('/api/purchases', { method: 'POST', body: { purchaseDate: purchaseDate.value, supplierId: supplierId.value, paymentMode: paymentMode.value, warehouse: warehouse.value, referenceNo: referenceNo.value || undefined, remarks: remarks.value || undefined, items: lines.value.map((line) => ({ ...line })) } })
    showForm.value = false
    lines.value = [{ productId: '', quantity: 1, unitCost: 0, discount: 0 }]
    supplierId.value = ''
    warehouse.value = 'Main'
    referenceNo.value = ''
    remarks.value = ''
    await refresh()
  } catch (error: any) {
    formError.value = error?.data?.data?.formErrors?.[0] || error?.data?.statusMessage || 'Could not save purchase'
  } finally { submitting.value = false }
}
</script>

<template>
  <div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h1 style="font-size:20px; margin:0;">Purchase Registry</h1>
      <button style="padding:8px 14px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;" @click="showForm = !showForm">{{ showForm ? 'Cancel' : '+ New Purchase' }}</button>
    </div>
    <div v-if="!supplierList?.length" class="card" style="border-style:dashed; margin-bottom:16px; color:var(--color-text-muted);">No suppliers yet — add one on the <NuxtLink to="/suppliers">Suppliers</NuxtLink> page before recording a purchase.</div>
    <div v-else-if="!productList?.length" class="card" style="border-style:dashed; margin-bottom:16px; color:var(--color-text-muted);">No products yet — add one on the <NuxtLink to="/inventory">Inventory</NuxtLink> page before recording a purchase.</div>

    <form v-if="showForm" class="card" style="margin-bottom:20px;" @submit.prevent="submit">
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:16px;">
        <div><label for="purchase-date" style="display:block; font-size:12px; margin-bottom:4px;">Date</label><input id="purchase-date" v-model="purchaseDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
        <div><label for="purchase-supplier" style="display:block; font-size:12px; margin-bottom:4px;">Supplier</label><select id="purchase-supplier" v-model="supplierId" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"><option value="" disabled>Select supplier</option><option v-for="supplier in supplierList" :key="supplier.id" :value="supplier.id">{{ supplier.name }} ({{ supplier.code }})</option></select></div>
        <div><label for="purchase-payment-mode" style="display:block; font-size:12px; margin-bottom:4px;">Payment Mode</label><select id="purchase-payment-mode" v-model="paymentMode" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"><option value="credit">Credit</option><option value="cash">Cash</option><option value="upi">UPI</option></select></div>
        <div><label for="purchase-warehouse" style="display:block; font-size:12px; margin-bottom:4px;">Warehouse</label><input id="purchase-warehouse" v-model="warehouse" required maxlength="100" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
        <div><label for="purchase-reference" style="display:block; font-size:12px; margin-bottom:4px;">Reference</label><input id="purchase-reference" v-model="referenceNo" maxlength="100" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
        <div><label for="purchase-remarks" style="display:block; font-size:12px; margin-bottom:4px;">Remarks</label><input id="purchase-remarks" v-model="remarks" maxlength="1000" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;"></div>
      </div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;"><thead><tr style="text-align:left; font-size:12px; color:var(--color-text-muted);"><th style="padding:4px;">Product</th><th style="padding:4px; width:90px;">Qty</th><th style="padding:4px; width:120px;">Unit Cost</th><th style="padding:4px; width:110px;">Discount</th><th style="padding:4px; width:110px; text-align:right;">Net Amount</th><th style="width:30px;"></th></tr></thead><tbody><tr v-for="(line, index) in lines" :key="index"><td style="padding:4px;"><select v-model="line.productId" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;" @change="onProductChange(line)"><option value="" disabled>Select product</option><option v-for="product in productList" :key="product.id" :value="product.id">{{ product.name }} ({{ product.code }})</option></select></td><td style="padding:4px;"><input v-model.number="line.quantity" type="number" min="0.01" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td><td style="padding:4px;"><input v-model.number="line.unitCost" type="number" min="0" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td><td style="padding:4px;"><input v-model.number="line.discount" type="number" min="0" :max="line.quantity * line.unitCost" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td><td style="padding:4px; text-align:right;" class="kpi-value">{{ fmt(lineNet(line)) }}</td><td style="padding:4px;"><button type="button" :disabled="lines.length === 1" style="background:none; border:none; color:var(--color-danger); cursor:pointer;" @click="removeLine(index)">×</button></td></tr></tbody></table>
      <button type="button" style="font-size:13px; background:none; border:1px dashed var(--color-border); border-radius:6px; padding:6px 12px; cursor:pointer; margin-bottom:16px;" @click="addLine">+ Add line</button>
      <div class="card" style="max-width:280px; margin-bottom:16px; background:var(--color-accent-soft); border:none;"><div style="display:flex; justify-content:space-between;"><span>Gross Amount</span><span class="kpi-value">{{ fmt(grossAmount) }}</span></div><div style="display:flex; justify-content:space-between;"><span>Discount</span><span class="kpi-value">{{ fmt(totalDiscount) }}</span></div><div style="display:flex; justify-content:space-between; font-weight:700;"><span>Net Amount</span><span class="kpi-value">{{ fmt(totalAmount) }}</span></div></div>
      <div v-if="formError" style="color:var(--color-danger); font-size:13px; margin-bottom:12px;">{{ formError }}</div><button type="submit" :disabled="submitting" style="padding:10px 16px; background:var(--color-accent); color:white; border:none; border-radius:6px; cursor:pointer;">{{ submitting ? 'Saving…' : 'Save Purchase' }}</button>
    </form>

    <div style="overflow-x:auto;"><table style="width:100%; min-width:1550px; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid var(--color-border);"><th style="padding:8px;">Date</th><th style="padding:8px;">Purchase No</th><th style="padding:8px;">Supplier</th><th style="padding:8px;">Product</th><th style="padding:8px;">Category</th><th style="padding:8px;">Qty</th><th style="padding:8px;">Unit Cost (Rs)</th><th style="padding:8px;">Discount (Rs)</th><th style="padding:8px;">Net Amount (Rs)</th><th style="padding:8px;">Payment Mode</th><th style="padding:8px;">Status</th><th style="padding:8px;">Warehouse</th><th style="padding:8px;">Reference</th><th style="padding:8px;">Remarks</th><th style="padding:8px;">Stock Updated</th></tr></thead><tbody><tr v-for="purchase in purchaseList" :key="purchase.id" style="border-bottom:1px solid var(--color-border);"><td style="padding:8px;">{{ purchase.purchaseDate }}</td><td style="padding:8px;">{{ purchase.purchaseNo }}</td><td style="padding:8px;">{{ purchase.supplierName || '—' }}</td><td style="padding:8px;">{{ purchase.productName }}</td><td style="padding:8px;">{{ purchase.category || 'Uncategorized' }}</td><td style="padding:8px;">{{ purchase.quantity }}</td><td style="padding:8px;">{{ fmt(purchase.unitCost) }}</td><td style="padding:8px;">{{ fmt(purchase.discount) }}</td><td style="padding:8px;">{{ fmt(Number(purchase.quantity) * Number(purchase.unitCost) - Number(purchase.discount)) }}</td><td style="padding:8px;">{{ purchase.paymentMode }}</td><td style="padding:8px;">{{ purchase.status }}</td><td style="padding:8px;">{{ purchase.warehouse }}</td><td style="padding:8px;">{{ purchase.referenceNo || '—' }}</td><td style="padding:8px;">{{ purchase.remarks || '—' }}</td><td style="padding:8px;">{{ purchase.stockUpdated ? 'Yes' : 'No' }}</td></tr></tbody></table></div>
  </div>
</template>
