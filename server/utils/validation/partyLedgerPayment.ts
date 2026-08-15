import { z } from 'zod'

export const PartyLedgerPaymentInput = z.object({
  partyType: z.enum(['customer', 'supplier']),
  partyId: z.string().uuid(),
  entryDate: z.string().date(),
  amount: z.number().positive().max(10_000_000),
  paymentMode: z.enum(['cash', 'upi']),
  referenceNo: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1_000).optional()
})
