<script setup lang="ts">
const destination = ref<'customer' | 'supplier'>('customer')

function continueToLedger() {
  return navigateTo(destination.value === 'customer' ? '/customer-ledger' : '/supplier-ledger')
}
</script>

<template>
  <main>
    <h1>Party Receipts & Payments</h1>
    <p class="intro">Post a receipt or payment only from the relevant party subledger. This prevents duplicate entry screens and keeps collections, allocations, and balances in one controlled workflow.</p>

    <section class="card selector" aria-labelledby="posting-destination">
      <h2 id="posting-destination">Choose Posting Workflow</h2>
      <label><input v-model="destination" type="radio" value="customer"> <strong>Customer Receipt</strong><span>Record money received, allocate it to credit invoices where applicable, and update receivables.</span></label>
      <label><input v-model="destination" type="radio" value="supplier"> <strong>Supplier Payment</strong><span>Record money paid to a supplier and update payables.</span></label>
      <button type="button" @click="continueToLedger">Continue to {{ destination === 'customer' ? 'Customer Ledger' : 'Supplier Ledger' }}</button>
    </section>

    <section class="card controls">
      <h2>Posting Controls</h2>
      <ul>
        <li>Select an existing Customer or Supplier Master; never create a duplicate party for a repeat transaction.</li>
        <li>Cash, UPI, bank, and cheque references must be recorded where applicable.</li>
        <li>Posted financial values are append-only. Correct a monetary or party error through an authorized reversal and reposting—not direct editing.</li>
        <li>Use the ledger for posting and audit review; use Customer/Supplier Master only for static identity and credit information.</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
main { max-width: 900px; }
h1 { margin: 0 0 4px; font-size: 20px; }
h2 { margin: 0 0 12px; font-size: 16px; }
.intro { margin: 0; color: var(--color-text-muted); }
.selector, .controls { display: grid; gap: 12px; margin-top: 20px; }
.selector label { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; align-items: start; cursor: pointer; }
.selector input { margin-top: 3px; }
.selector strong { display: block; }
.selector span { grid-column: 2; color: var(--color-text-muted); font-size: 13px; margin-top: 2px; }
button { width: fit-content; padding: 9px 14px; background: var(--color-accent); color: #fff; border: 0; border-radius: 5px; cursor: pointer; }
ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; color: var(--color-text-muted); font-size: 13px; }
</style>
