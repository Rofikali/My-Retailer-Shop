import { z } from 'zod'

export const ProductInput = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  category: z.string().max(80).optional(),
  unit: z.string().max(20).optional(),
  reorderLevel: z.number().min(0).default(0),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional()
})

export type ProductInputType = z.infer<typeof ProductInput>
