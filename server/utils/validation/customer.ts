import { z } from 'zod'

export const CustomerInput = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  creditLimit: z.number().min(0).optional()
})

export type CustomerInputType = z.infer<typeof CustomerInput>
