import { z } from 'zod'

export const PurchaseLineInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCost: z.number().min(0),
  discount: z.number().min(0).default(0)
}).refine((line) => line.discount <= line.quantity * line.unitCost, {
  message: 'Discount cannot exceed the line amount',
  path: ['discount']
})

export const PurchaseInput = z.object({
  purchaseDate: z.string().date(),
  supplierId: z.string().uuid(),
  paymentMode: z.enum(['cash', 'upi', 'credit']),
  dueDate: z.string().date().optional(),
  warehouse: z.string().trim().min(1).max(100).default('Main'),
  referenceNo: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1_000).optional(),
  items: z.array(PurchaseLineInput).min(1, 'At least one line item is required')
}).superRefine((data, context) => {
  if (data.paymentMode === 'credit' && !data.dueDate) context.addIssue({ code: z.ZodIssueCode.custom, message: 'A due date is required for a credit purchase', path: ['dueDate'] })
  if (data.dueDate && data.dueDate < data.purchaseDate) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Due date cannot be before the purchase date', path: ['dueDate'] })
  if (data.paymentMode !== 'credit' && data.dueDate) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Due date is only used for credit purchases', path: ['dueDate'] })
})

export type PurchaseInputType = z.infer<typeof PurchaseInput>
