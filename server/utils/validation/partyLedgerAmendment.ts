import { z } from 'zod'

export const PartyLedgerAmendmentInput = z.object({
  particulars: z.string().trim().min(1).max(500),
  paymentMode: z.enum(['cash', 'upi', 'credit']).nullable(),
  referenceNo: z.string().trim().max(100).nullable(),
  dueDate: z.string().date().nullable(),
  remarks: z.string().trim().max(1_000).nullable(),
  reason: z.string().trim().min(10, 'A correction reason of at least 10 characters is required').max(500)
})

export type PartyLedgerAmendmentInputType = z.infer<typeof PartyLedgerAmendmentInput>
