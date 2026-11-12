import { z } from 'zod'
import { calculatePurchaseMoney } from '../../domain/money/purchase'

export const PurchaseLineInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCost: z.number().min(0),
  discount: z.number().min(0).default(0)
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

  try {
    // Validate precision and discount limits using the same exact paise policy
    // that the purchase service uses; never validate money with float multiplication.
    calculatePurchaseMoney(data.items)
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invalid purchase line amount.',
      path: ['items']
    })
  }
})

export type PurchaseInputType = z.infer<typeof PurchaseInput>
