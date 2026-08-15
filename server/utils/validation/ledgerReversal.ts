import { z } from 'zod'

export const LedgerReversalInput = z.object({
  referenceId: z.string().uuid(),
  reversalDate: z.string().date(),
  reason: z.string().trim().min(10, 'A correction reason of at least 10 characters is required').max(500)
})
