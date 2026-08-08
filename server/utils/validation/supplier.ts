import { z } from 'zod'

export const SupplierInput = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  creditTermsDays: z.number().min(0).optional()
})

export type SupplierInputType = z.infer<typeof SupplierInput>
