<script setup lang="ts">
interface Sale {
  id: string
  invoiceNo: string
  saleDate: string
  productName: string
  category: string | null
  quantity: string
  costPrice: string
  unitPrice: string
  discount: string
  paymentMode: string
  status: string
  customerName: string | null
  salespersonName: string | null
  referenceNo: string | null
  remarks: string | null
}
interface Product {
  id: string
  code: string
  name: string
  costPrice: string | null
  sellingPrice: string | null
}
interface Customer {
  id: string
  code: string
  name: string
}
interface SaleLine {
  productId: string
  quantity: number
  costPrice: number
  sellingPrice: number
  discount: number
}

const { data: saleList, refresh } = await useFetch<Sale[]>('/api/sales')
const { data: productList } = await useFetch<Product[]>('/api/products')
const { data: customerList } = await useFetch<Customer[]>('/api/customers')

const showForm = ref(false)
const submitting = ref(false)
const formError = ref('')

const saleDate = ref(new Date().toISOString().slice(0, 10))
const paymentMode = ref<'cash' | 'upi' | 'credit'>('cash')
const customerId = ref('')
const referenceNo = ref('')
const remarks = ref('')
const lines = ref<SaleLine[]>([{ productId: '', quantity: 1, costPrice: 0, sellingPrice: 0, discount: 0 }])

function addLine() {
  lines.value.push({ productId: '', quantity: 1, costPrice: 0, sellingPrice: 0, discount: 0 })
}
function removeLine(i: number) {
  lines.value.splice(i, 1)
}
function onProductChange(line: SaleLine) {
  const p = productList.value?.find((p) => p.id === line.productId)
  if (p) {
    line.costPrice = Number(p.costPrice ?? 0)
    line.sellingPrice = Number(p.sellingPrice ?? 0)
  }
}

const grossAmount = computed(() => lines.value.reduce((sum, line) => sum + line.quantity * line.sellingPrice, 0))
const totalDiscount = computed(() => lines.value.reduce((sum, line) => sum + line.discount, 0))
const totalSale = computed(() => grossAmount.value - totalDiscount.value)
const totalCost = computed(() => lines.value.reduce((s, l) => s + l.quantity * l.costPrice, 0))
const grossProfit = computed(() => totalSale.value - totalCost.value)
const lineNet = (line: SaleLine) => line.quantity * line.sellingPrice - line.discount
const lineProfit = (sale: Sale) => Number(sale.quantity) * Number(sale.unitPrice) - Number(sale.discount) - Number(sale.quantity) * Number(sale.costPrice)

function fmt(v: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
}

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    await $fetch('/api/sales', {
      method: 'POST',
      body: {
        saleDate: saleDate.value,
        customerId: customerId.value || undefined,
        paymentMode: paymentMode.value,
        referenceNo: referenceNo.value || undefined,
        remarks: remarks.value || undefined,
        items: lines.value.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          costPrice: l.costPrice,
          sellingPrice: l.sellingPrice,
          discount: l.discount
        }))
      }
    })
    showForm.value = false
    lines.value = [{ productId: '', quantity: 1, costPrice: 0, sellingPrice: 0, discount: 0 }]
    customerId.value = ''
    referenceNo.value = ''
    remarks.value = ''
    await refresh()
  } catch (e: any) {
    formError.value =
      e?.data?.data?.fieldErrors?.customerId?.[0] ||
      e?.data?.data?.formErrors?.[0] ||
      e?.data?.statusMessage ||
      'Could not save sale'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="font-size: 20px; margin: 0;">Sales Registry</h1>
      <button style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New Sale' }}
      </button>
    </div>

    <div v-if="!productList?.length" class="card" style="border-style: dashed; margin-bottom: 16px; color: var(--color-text-muted);">
      No products yet — add products via <code>POST /api/products</code> (or build the Inventory page next)
      before you can record a sale.
    </div>

    <form v-if="showForm" class="card" style="margin-bottom: 20px;" @submit.prevent="submit">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
        <div>
          <label style="display:block; font-size:12px; margin-bottom:4px;">Date</label>
          <input v-model="saleDate" type="date" required style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
        <div>
          <label style="display:block; font-size:12px; margin-bottom:4px;">Payment Mode</label>
          <select v-model="paymentMode" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="credit">Credit</option>
          </select>
        </div>
        <div>
          <label for="sale-reference" style="display:block; font-size:12px; margin-bottom:4px;">Reference</label>
          <input id="sale-reference" v-model="referenceNo" maxlength="100" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
        <div>
          <label for="sale-remarks" style="display:block; font-size:12px; margin-bottom:4px;">Remarks</label>
          <input id="sale-remarks" v-model="remarks" maxlength="1000" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
        </div>
        <div>
          <label style="display:block; font-size:12px; margin-bottom:4px;">
            Customer {{ paymentMode === 'credit' ? '(required)' : '(optional — walk-in if blank)' }}
          </label>
          <select v-model="customerId" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px;">
            <option value="">Walk-in</option>
            <option v-for="c in customerList" :key="c.id" :value="c.id">{{ c.name }} ({{ c.code }})</option>
          </select>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <thead>
          <tr style="text-align: left; font-size: 12px; color: var(--color-text-muted);">
            <th style="padding: 4px;">Product</th>
            <th style="padding: 4px; width: 80px;">Qty</th>
            <th style="padding: 4px; width: 110px;">Cost Price</th>
            <th style="padding: 4px; width: 110px;">Selling Price</th>
            <th style="padding: 4px; width: 110px;">Discount</th>
            <th style="padding: 4px; width: 100px; text-align: right;">Net Amount</th>
            <th style="width: 30px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, i) in lines" :key="i">
            <td style="padding: 4px;">
              <select v-model="line.productId" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;" @change="onProductChange(line)">
                <option value="" disabled>Select product</option>
                <option v-for="p in productList" :key="p.id" :value="p.id">{{ p.name }} ({{ p.code }})</option>
              </select>
            </td>
            <td style="padding: 4px;"><input v-model.number="line.quantity" type="number" min="0.01" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td>
            <td style="padding: 4px;"><input v-model.number="line.costPrice" type="number" min="0" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td>
            <td style="padding: 4px;"><input v-model.number="line.sellingPrice" type="number" min="0" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td>
            <td style="padding: 4px;"><input v-model.number="line.discount" type="number" min="0" :max="line.quantity * line.sellingPrice" step="0.01" required style="width:100%; padding:6px; border:1px solid var(--color-border); border-radius:6px;"></td>
            <td style="padding: 4px; text-align: right;" class="kpi-value">{{ fmt(lineNet(line)) }}</td>
            <td style="padding: 4px;">
              <button type="button" :disabled="lines.length === 1" style="background:none; border:none; color: var(--color-danger); cursor:pointer;" @click="removeLine(i)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <button type="button" style="font-size: 13px; background: none; border: 1px dashed var(--color-border); border-radius: 6px; padding: 6px 12px; cursor: pointer; margin-bottom: 16px;" @click="addLine">
        + Add line
      </button>

      <div class="card" style="max-width: 320px; margin-bottom: 16px; background: var(--color-accent-soft); border: none;">
        <div style="display:flex; justify-content:space-between;"><span>Gross Amount</span><span class="kpi-value">{{ fmt(grossAmount) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Discount</span><span class="kpi-value">{{ fmt(totalDiscount) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Net Amount</span><span class="kpi-value">{{ fmt(totalSale) }}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Total Cost</span><span class="kpi-value">{{ fmt(totalCost) }}</span></div>
        <div style="display:flex; justify-content:space-between; font-weight:700;"><span>Gross Profit</span><span class="kpi-value">{{ fmt(grossProfit) }}</span></div>
      </div>

      <div v-if="formError" style="color: var(--color-danger); font-size: 13px; margin-bottom: 12px;">{{ formError }}</div>
      <button type="submit" :disabled="submitting" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
        {{ submitting ? 'Saving…' : 'Save Sale' }}
      </button>
    </form>

    <div style="overflow-x: auto;">
    <table style="width: 100%; min-width: 1700px; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Date</th><th style="padding: 8px;">Invoice No</th><th style="padding: 8px;">Customer</th>
          <th style="padding: 8px;">Product</th><th style="padding: 8px;">Category</th><th style="padding: 8px;">Qty</th>
          <th style="padding: 8px;">Cost Price (Rs)</th><th style="padding: 8px;">Unit Price (Rs)</th><th style="padding: 8px;">Discount (Rs)</th>
          <th style="padding: 8px;">Net Amount (Rs)</th><th style="padding: 8px;">Payment Mode</th><th style="padding: 8px;">Status</th>
          <th style="padding: 8px;">Salesperson</th><th style="padding: 8px;">Reference</th><th style="padding: 8px;">Remarks</th><th style="padding: 8px;">Profit (Rs)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in saleList" :key="s.id" style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 8px;">{{ s.saleDate }}</td>
          <td style="padding: 8px;">{{ s.invoiceNo }}</td>
          <td style="padding: 8px;">{{ s.customerName || 'Walk-in' }}</td>
          <td style="padding: 8px;">{{ s.productName }}</td>
          <td style="padding: 8px;">{{ s.category || 'Uncategorized' }}</td>
          <td style="padding: 8px;">{{ s.quantity }}</td>
          <td style="padding: 8px;">{{ fmt(s.costPrice) }}</td>
          <td style="padding: 8px;">{{ fmt(s.unitPrice) }}</td>
          <td style="padding: 8px;">{{ fmt(s.discount) }}</td>
          <td style="padding: 8px;">{{ fmt(Number(s.quantity) * Number(s.unitPrice) - Number(s.discount)) }}</td>
          <td style="padding: 8px;">{{ s.paymentMode }}</td>
          <td style="padding: 8px;">{{ s.status }}</td>
          <td style="padding: 8px;">{{ s.salespersonName || 'Unknown' }}</td>
          <td style="padding: 8px;">{{ s.referenceNo || '—' }}</td>
          <td style="padding: 8px;">{{ s.remarks || '—' }}</td>
          <td style="padding: 8px;">{{ fmt(lineProfit(s)) }}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>
