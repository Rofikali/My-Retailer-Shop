<script setup lang="ts">
interface TrialBalanceData { balanced: boolean; difference: number; totalDebit: number; totalCredit: number }
interface BalanceSheetData { balanced: boolean; difference: number }
interface LedgerEntry {
  id: string
  entryDate: string
  accountName: string
  debit: string
  credit: string
  description: string | null
  referenceType: string
  enteredBy: string | null
  isReversal: string | null
}

const { data: trialBalance } = await useFetch<TrialBalanceData>('/api/reports/trial-balance')
const { data: balanceSheet } = await useFetch<BalanceSheetData>('/api/reports/balance-sheet')
const { data: recentEntries, error: entriesError } = await useFetch<LedgerEntry[]>('/api/admin/ledger-entries', { query: { limit: 50 } })

function fmt(v: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 4px;">Data Quality &amp; Reconciliation</h1>
    <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 20px;">
      Owner and read-only accountant access. This page has no separate "audit table" to maintain — every
      row below is read directly from <code>ledger_entries</code>, which already carries who entered it and
      when. See <code>docs/10-Security-and-Data-Integrity.md</code>.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; max-width: 600px;">
      <div class="card" :style="{ borderColor: trialBalance?.balanced ? 'var(--color-accent)' : 'var(--color-danger)' }">
        <div style="font-size: 12px; color: var(--color-text-muted);">Trial Balance</div>
        <div style="font-weight: 700; margin-top: 4px;">
          {{ trialBalance?.balanced ? '✓ Balanced' : `✗ Difference: ${fmt(trialBalance?.difference ?? 0)}` }}
        </div>
      </div>
      <div class="card" :style="{ borderColor: balanceSheet?.balanced ? 'var(--color-accent)' : 'var(--color-danger)' }">
        <div style="font-size: 12px; color: var(--color-text-muted);">Balance Sheet</div>
        <div style="font-weight: 700; margin-top: 4px;">
          {{ balanceSheet?.balanced ? '✓ Balanced' : `✗ Difference: ${fmt(balanceSheet?.difference ?? 0)}` }}
        </div>
      </div>
    </div>

    <div v-if="trialBalance && !trialBalance.balanced" class="card" style="border-color: var(--color-danger); margin-bottom: 24px;">
      <strong>This should not happen on this system.</strong>
      <p style="font-size: 13px; margin: 4px 0 0;">
        Every write in this app goes through <code>LedgerService.post()</code>, which rejects unbalanced
        postings before they reach the database (see <code>tests/ledger.service.test.ts</code>). A nonzero
        difference here means some code path bypassed it — that's a bug to fix in the codebase, not a
        data-entry issue to reconcile by hand like the old spreadsheet.
      </p>
    </div>

    <h2 style="font-size: 16px; margin-bottom: 12px;">Recent Ledger Activity</h2>
    <div v-if="entriesError" class="card" style="border-color: var(--color-danger);">
      {{ entriesError.statusMessage || 'You do not have permission to view this.' }}
    </div>
    <table v-else style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
          <th style="padding: 8px;">Date</th><th style="padding: 8px;">Account</th><th style="padding: 8px;">Description</th>
          <th style="padding: 8px; text-align: right;">Debit</th><th style="padding: 8px; text-align: right;">Credit</th>
          <th style="padding: 8px;">Type</th><th style="padding: 8px;">Entered By</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in recentEntries" :key="e.id" style="border-bottom: 1px solid var(--color-border);" :style="{ background: e.isReversal ? 'var(--color-accent-soft)' : 'transparent' }">
          <td style="padding: 8px;">{{ e.entryDate }}</td>
          <td style="padding: 8px;">{{ e.accountName }}</td>
          <td style="padding: 8px;">{{ e.description || '—' }}{{ e.isReversal ? ' (reversal)' : '' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(e.debit) > 0 ? fmt(e.debit) : '—' }}</td>
          <td style="padding: 8px; text-align: right;" class="kpi-value">{{ Number(e.credit) > 0 ? fmt(e.credit) : '—' }}</td>
          <td style="padding: 8px;">{{ e.referenceType }}</td>
          <td style="padding: 8px;">{{ e.enteredBy || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
