import { z } from 'zod'

export const SaleLineInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0)
})

export const SaleInput = z.object({
  saleDate: z.string().date(),
  customerId: z.string().uuid().optional(), // absent = walk-in
  paymentMode: z.enum(['cash', 'upi', 'credit']),
  items: z.array(SaleLineInput).min(1, 'At least one line item is required')
}).refine((data) => data.paymentMode !== 'credit' || !!data.customerId, {
  message: 'A customer must be selected for a credit sale (so the receivable has somewhere to post)',
  path: ['customerId']
})

export type SaleInputType = z.infer<typeof SaleInput>
