import { z } from 'zod'

// Matches the expense accounts seeded in server/db/seed.ts exactly - the mapping in
// ExpensesService relies on this list staying in sync with the chart of accounts.
export const expenseCategories = [
  'Utilities', 'Transportation', 'Maintenance', 'Office Supplies', 'Business Loss', 'Donation'
] as const

export const ExpenseInput = z.object({
  expenseDate: z.string().date(),
  category: z.enum(expenseCategories),
  description: z.string().min(1, 'Description is required').max(200),
  vendor: z.string().max(150).optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Other']),
  department: z.string().max(80).optional()
})

export type ExpenseInputType = z.infer<typeof ExpenseInput>
