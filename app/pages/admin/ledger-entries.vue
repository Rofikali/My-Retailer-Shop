<script setup lang="ts">
interface LedgerEntry {
  id: string
  entryDate: string
  accountName: string
  debit: string
  credit: string
  description: string
  referenceId: string
  referenceType: string
  enteredBy: string | null
  createdAt: string
  isReversal: string | null
}

const { user } = useAuth()
const { data: entries, refresh, error } = await useFetch<LedgerEntry[]>('/api/admin/ledger-entries')
const isOwner = computed(() => user.value?.role === 'owner')
const showReversalForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const formSuccess = ref('')
const form = reactive({
  referenceId: '',
  reversalDate: new Date().toISOString().slice(0, 10),
  reason: ''
})

function selectForReversal(entry: LedgerEntry) {
  form.referenceId = entry.referenceId
  form.reason = ''
  formError.value = ''
  formSuccess.value = ''
  showReversalForm.value = true
}

async function reverse() {
  formError.value = ''
  formSuccess.value = ''
  submitting.value = true

  try {
    await $fetch('/api/admin/ledger-reversals', {
      method: 'POST',
      body: { ...form }
    })
    formSuccess.value = 'The correcting reversal was posted. The original entries remain in the audit trail.'
    form.referenceId = ''
    form.reason = ''
    await refresh()
  } catch (requestError: any) {
    formError.value = requestError?.data?.statusMessage || 'Could not post the reversal.'
  } finally {
    submitting.value = false
  }
}

function formatAmount(amount: string) {
  return Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div>
    <h1 style="font-size: 20px; margin-bottom: 4px;">Ledger Audit</h1>
    <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 20px;">
      Posted entries are immutable. Corrections create a linked reversing entry and preserve the audit trail.
    </p>

    <div v-if="error" class="card" style="border-color: var(--color-danger);">
      {{ error.statusMessage || 'You do not have permission to view this page.' }}
    </div>

    <template v-else>
      <div v-if="isOwner" class="card" style="margin-bottom: 20px;">
        <button
          type="button"
          style="padding: 8px 14px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;"
          @click="showReversalForm = !showReversalForm"
        >
          {{ showReversalForm ? 'Cancel correction' : 'Post correcting reversal' }}
        </button>

        <form v-if="showReversalForm" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px;" @submit.prevent="reverse">
          <label style="font-size: 12px;">Reference ID
            <input v-model="form.referenceId" required readonly style="display: block; width: 100%; margin-top: 4px; padding: 8px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg);">
          </label>
          <label style="font-size: 12px;">Reversal date
            <input v-model="form.reversalDate" type="date" required style="display: block; width: 100%; margin-top: 4px; padding: 8px; border: 1px solid var(--color-border); border-radius: 6px;">
          </label>
          <label style="grid-column: 1 / -1; font-size: 12px;">Reason for correction
            <textarea v-model="form.reason" required minlength="10" maxlength="500" rows="3" style="display: block; width: 100%; margin-top: 4px; padding: 8px; border: 1px solid var(--color-border); border-radius: 6px;"></textarea>
          </label>
          <div style="grid-column: 1 / -1; font-size: 12px; color: var(--color-text-muted);">
            Only opening-balance entries can be reversed here. Sales, purchases, and other operational documents require their dedicated correction workflows.
          </div>
          <div style="grid-column: 1 / -1;">
            <div v-if="formError" style="margin-bottom: 8px; color: var(--color-danger);">{{ formError }}</div>
            <div v-if="formSuccess" style="margin-bottom: 8px; color: var(--color-accent);">{{ formSuccess }}</div>
            <button type="submit" :disabled="submitting || !form.referenceId" style="padding: 10px 16px; background: var(--color-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
              {{ submitting ? 'Posting…' : 'Post reversal' }}
            </button>
          </div>
        </form>
      </div>

      <div v-else class="card" style="margin-bottom: 20px; color: var(--color-text-muted);">
        This is a read-only audit view. Only an owner can post a correcting reversal.
      </div>

      <div class="card" style="overflow-x: auto; padding: 0;">
        <table style="width: 100%; min-width: 920px; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--color-border);">
              <th style="padding: 10px;">Date</th><th style="padding: 10px;">Account</th><th style="padding: 10px;">Description</th>
              <th style="padding: 10px; text-align: right;">Debit (Rs)</th><th style="padding: 10px; text-align: right;">Credit (Rs)</th>
              <th style="padding: 10px;">Type</th><th style="padding: 10px;">Entered by</th><th v-if="isOwner" style="padding: 10px;"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries || []" :key="entry.id" style="border-bottom: 1px solid var(--color-border);">
              <td style="padding: 10px; white-space: nowrap;">{{ entry.entryDate }}</td>
              <td style="padding: 10px;">{{ entry.accountName }}</td>
              <td style="padding: 10px; max-width: 300px;">{{ entry.description }}</td>
              <td style="padding: 10px; text-align: right;">{{ formatAmount(entry.debit) }}</td>
              <td style="padding: 10px; text-align: right;">{{ formatAmount(entry.credit) }}</td>
              <td style="padding: 10px;">{{ entry.isReversal ? 'Reversal' : entry.referenceType }}</td>
              <td style="padding: 10px;">{{ entry.enteredBy || 'System' }}</td>
              <td v-if="isOwner" style="padding: 10px;">
                <button
                  v-if="entry.referenceType === 'opening_balance' && !entry.isReversal"
                  type="button"
                  style="border: 1px solid var(--color-border); border-radius: 6px; padding: 4px 10px; background: white; cursor: pointer;"
                  @click="selectForReversal(entry)"
                >
                  Correct
                </button>
              </td>
            </tr>
            <tr v-if="!entries?.length"><td :colspan="isOwner ? 8 : 7" style="padding: 16px; color: var(--color-text-muted);">No ledger entries found.</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
