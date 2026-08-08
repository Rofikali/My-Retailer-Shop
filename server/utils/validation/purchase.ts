import { z } from 'zod'

export const PurchaseLineInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCost: z.number().min(0)
})

export const PurchaseInput = z.object({
  purchaseDate: z.string().date(),
  supplierId: z.string().uuid(),
  paymentMode: z.enum(['cash', 'upi', 'credit']),
  items: z.array(PurchaseLineInput).min(1, 'At least one line item is required')
})

export type PurchaseInputType = z.infer<typeof PurchaseInput>
