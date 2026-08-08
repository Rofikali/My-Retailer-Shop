import { z } from 'zod'

export const InventoryAdjustmentInput = z.object({
  productId: z.string().uuid(),
  adjustmentDate: z.string().date(),
  reason: z.enum(['opening', 'damage', 'correction']),
  quantity: z.number(), // sign matters only for 'correction'; opening/damage are always positive magnitudes
  remarks: z.string().max(300).optional()
}).refine((data) => data.quantity !== 0 && (data.reason === 'correction' || data.quantity > 0), {
  message: 'Quantity cannot be zero and must be positive for opening stock and damage entries',
  path: ['quantity']
})

export type InventoryAdjustmentInputType = z.infer<typeof InventoryAdjustmentInput>
