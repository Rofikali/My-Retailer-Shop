import { z } from 'zod'

export const JournalInput = z.object({
  entryDate: z.string().date(),
  voucherNo: z.string().trim().max(100).optional(),
  debitAccountCode: z.string().trim().min(1).max(50),
  creditAccountCode: z.string().trim().min(1).max(50),
  particulars: z.string().trim().min(1).max(1_000),
  amount: z.number().positive().finite(),
  reference: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1_000).optional()
}).superRefine((value, context) => {
  if (value.debitAccountCode === value.creditAccountCode) context.addIssue({ code: z.ZodIssueCode.custom, path: ['creditAccountCode'], message: 'Debit and credit accounts must be different' })
})

export type JournalInputType = z.infer<typeof JournalInput>
