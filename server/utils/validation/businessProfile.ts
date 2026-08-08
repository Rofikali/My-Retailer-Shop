import { z } from 'zod'

export const BusinessProfileInput = z.object({
  businessName: z.string().min(1, 'Business name is required').max(150),
  financialYearStart: z.string().date(),
  financialYearEnd: z.string().date(),
  gstRegistered: z.boolean(),
  gstin: z.string().max(20).optional(),
  address: z.string().max(300).optional()
}).refine((data) => !data.gstRegistered || !!data.gstin, {
  message: 'GSTIN is required when marked as GST registered',
  path: ['gstin']
})

export type BusinessProfileInputType = z.infer<typeof BusinessProfileInput>
