import { z } from 'zod'

export const SupplierInput = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  company: z.string().trim().max(150).optional(),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().trim().max(20).optional(),
  address: z.string().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pinCode: z.string().trim().max(20).optional(),
  openingBalance: z.number().min(0).default(0),
  creditTermsDays: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  supplierType: z.string().trim().min(1).max(80).default('regular'),
  rating: z.number().min(0).max(5).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  remarks: z.string().trim().max(1_000).optional()
})

export type SupplierInputType = z.infer<typeof SupplierInput>
