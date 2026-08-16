import { z } from 'zod'

export const BusinessProfileInput = z.object({
  businessName: z.string().min(1, 'Business name is required').max(150),
  financialYearStart: z.string().date(),
  financialYearEnd: z.string().date(),
  gstRegistered: z.boolean(),
  gstin: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(150).optional().or(z.literal('')),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pinCode: z.string().max(12).optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
  timezone: z.string().min(1).max(80),
  invoicePrefix: z.string().min(1).max(20).regex(/^[A-Z0-9-]+$/),
  purchasePrefix: z.string().min(1).max(20).regex(/^[A-Z0-9-]+$/),
  defaultWarehouse: z.string().min(1).max(100)
}).refine((data) => !data.gstRegistered || !!data.gstin, {
  message: 'GSTIN is required when marked as GST registered',
  path: ['gstin']
})

export type BusinessProfileInputType = z.infer<typeof BusinessProfileInput>
