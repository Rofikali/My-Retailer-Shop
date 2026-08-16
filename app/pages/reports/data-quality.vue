<script setup lang="ts">
interface ReviewItem { area: string; title: string; status: 'pass' | 'warning' | 'action'; detail: string; recommendation: string }
interface ReviewData { reviewedAt: string; counts: { pass: number; warning: number; action: number }; readyForProduction: boolean; scope: Record<string, number>; notes: string[]; items: ReviewItem[] }

const { data, pending, error, refresh } = await useFetch<ReviewData>('/api/reports/data-quality')
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const rerunReview = () => refresh()
const implementationOrder = [
  ['1', 'Database schema and invariants', 'Foundation for reliable keys, constraints, and append-only rules.'],
  ['2', 'Authentication and RBAC', 'Protects financial and personal data before wider usage.'],
  ['3', 'Customer, Supplier, and Product Masters', 'Creates stable references for every transaction.'],
  ['4', 'Inventory movements', 'Makes stock auditable instead of editable totals.'],
  ['5', 'Sales, Purchases, and Expenses', 'Captures the operational source transactions.'],
  ['6', 'Customer and Supplier Ledgers', 'Keeps party balances and statements reconciled.'],
  ['7', 'General Ledger and Journal Posting', 'Establishes double-entry accounting as the source of truth.'],
  ['8', 'Financial Reports', 'Builds reports only after posting integrity exists.'],
  ['9', 'Data Quality Review', 'Finds production blockers before release.'],
  ['10', 'Tests and CI gates', 'Prevents regressions across accounting paths.'],
  ['11', 'Deployment, backups, observability, and runbooks', 'Makes production operation safe and recoverable.']
]
</script>

<template>
  <div class="review-page">
    <div class="page-header"><div><h1>Notes &amp; Data Quality Review</h1><p>CA/accounts-style working paper for production readiness and report reliability.</p></div><div class="header-actions"><NuxtLink class="button button--secondary" to="/reports/trial-balance">Trial Balance</NuxtLink><button class="button" type="button" :disabled="pending" @click="rerunReview">{{ pending ? 'Reviewing…' : 'Run Review' }}</button></div></div>
    <div v-if="error" class="card error">Unable to load the review. Confirm the database is available and try again.</div>
    <template v-else-if="data">
      <div class="status-banner" :class="data.readyForProduction ? 'status-banner--ready' : 'status-banner--blocked'"><strong>{{ data.readyForProduction ? 'No blocking actions found' : 'Production review has blocking actions' }}</strong><span>Last reviewed {{ dateLabel(data.reviewedAt) }}</span></div>
      <div class="summary-grid"><div class="summary-card"><span>Passed</span><strong class="pass">{{ data.counts.pass }}</strong></div><div class="summary-card"><span>Warnings</span><strong class="warning">{{ data.counts.warning }}</strong></div><div class="summary-card"><span>Actions</span><strong class="action">{{ data.counts.action }}</strong></div><div class="summary-card"><span>Ledger Rows</span><strong>{{ data.scope.ledgerEntries }}</strong></div></div>
      <section class="card notes-card"><h2>Review Notes</h2><ul><li v-for="note in data.notes" :key="note">{{ note }}</li></ul></section>
      <section class="card"><div class="section-title"><h2>Data Quality Findings</h2><span>Read-only review</span></div><div class="finding-list"><article v-for="item in data.items" :key="item.area" class="finding" :class="`finding--${item.status}`"><div class="finding-heading"><div><small>{{ item.area }}</small><h3>{{ item.title }}</h3></div><strong>{{ item.status.toUpperCase() }}</strong></div><p>{{ item.detail }}</p><div class="recommendation"><b>Recommended action:</b> {{ item.recommendation }}</div></article></div></section>
      <section class="card roadmap-card"><div class="section-title"><h2>Recommended Implementation Order</h2><span>See docs/14-Implementation-Roadmap.md</span></div><ol><li v-for="step in implementationOrder" :key="step[0]"><b>{{ step[0] }}. {{ step[1] }}</b><span>{{ step[2] }}</span></li></ol></section>
    </template>
  </div>
</template>

<style scoped>
.review-page { max-width: 1100px; }.page-header, .section-title, .finding-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }h1 { margin: 0; font-size: 24px; }h2 { margin: 0; font-size: 17px; }h3 { margin: 4px 0 0; font-size: 15px; }.page-header p { margin: 6px 0 0; color: var(--color-muted); }.header-actions { display: flex; gap: 8px; }.button { padding: 9px 14px; border: 1px solid var(--color-accent); border-radius: 6px; background: var(--color-accent); color: white; cursor: pointer; text-decoration: none; }.button--secondary { background: transparent; color: var(--color-text); border-color: var(--color-border); }.button:disabled { opacity: .6; cursor: wait; }.card { margin-top: 16px; padding: 18px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }.status-banner { display: flex; justify-content: space-between; margin-top: 22px; padding: 13px 16px; border-left: 4px solid; border-radius: 5px; }.status-banner--ready { border-color: var(--color-accent); background: #ecfdf3; color: #166534; }.status-banner--blocked { border-color: var(--color-danger); background: #fef2f2; color: #991b1b; }.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }.summary-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }.summary-card span, small { color: var(--color-muted); font-size: 12px; }.summary-card strong { font-size: 24px; }.pass { color: #15803d; }.warning { color: #b45309; }.action { color: #b91c1c; }.notes-card ul { margin: 14px 0 0; padding-left: 20px; line-height: 1.8; }.section-title { padding-bottom: 12px; border-bottom: 1px solid var(--color-border); }.section-title span { color: var(--color-muted); font-size: 12px; }.finding-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }.finding { padding: 15px; border-left: 4px solid; border-radius: 5px; background: var(--color-background); }.finding--pass { border-color: #22c55e; }.finding--warning { border-color: #f59e0b; }.finding--action { border-color: #ef4444; }.finding-heading strong { font-size: 11px; }.finding--pass .finding-heading strong { color: #15803d; }.finding--warning .finding-heading strong { color: #b45309; }.finding--action .finding-heading strong { color: #b91c1c; }.finding p { margin: 12px 0 8px; line-height: 1.45; }.recommendation { color: var(--color-muted); font-size: 13px; line-height: 1.4; }.error { color: var(--color-danger); }@media (max-width: 760px) { .page-header, .status-banner { align-items: flex-start; flex-direction: column; }.summary-grid, .finding-list { grid-template-columns: 1fr 1fr; } }@media (max-width: 520px) { .summary-grid, .finding-list { grid-template-columns: 1fr; } }
</style>
