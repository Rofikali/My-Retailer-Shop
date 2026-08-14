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
  warehouse: z.string().trim().min(1).max(100).default('Main'),
  referenceNo: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1_000).optional(),
  items: z.array(PurchaseLineInput).min(1, 'At least one line item is required')
})

export type PurchaseInputType = z.infer<typeof PurchaseInput>
