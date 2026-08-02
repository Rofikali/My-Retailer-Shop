import { z } from 'zod'

export const cashTxnCategories = ['capital', 'sales', 'expense', 'drawings', 'purchase', 'other'] as const

export const CashTxnInput = z.object({
  txnDate: z.string().date(),
  particulars: z.string().min(1, 'Particulars is required').max(200),
  category: z.enum(cashTxnCategories),
  receipt: z.number().min(0).default(0),
  payment: z.number().min(0).default(0),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Other']),
  referenceNo: z.string().max(100).optional()
}).refine((data) => (data.receipt > 0) !== (data.payment > 0), {
  message: 'Exactly one of receipt or payment must be greater than zero, not both and not neither.'
})

export type CashTxnInputType = z.infer<typeof CashTxnInput>
