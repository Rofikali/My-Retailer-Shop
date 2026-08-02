<script setup lang="ts">
// STUB — not yet implemented. Build this following the exact same pattern as
// app/pages/cashbook/index.vue + server/services/cashbook.service.ts:
//   1. server/repositories/suppliers.repo.ts   — Drizzle queries only
//   2. server/services/suppliers.service.ts    — business logic, calls LedgerService
//      inside a db.transaction() for anything that posts to the ledger
//   3. server/api/suppliers/index.get.ts + index.post.ts — thin route handlers
//   4. this page — list + form, same structure as Cash Book
// See docs/04-LLD.md section 2 for the full Record-a-Credit-Sale sequence this generalizes from.
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 12px;">Suppliers</h1>
    <div class="card" style="border-style: dashed; color: var(--color-text-muted);">
      Not yet implemented — the database schema and architecture already support this module.
      Follow the Cash Book page/service/repository as the reference pattern (see comment in this file).
    </div>
  </div>
</template>
