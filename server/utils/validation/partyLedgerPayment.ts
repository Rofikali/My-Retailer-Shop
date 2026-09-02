import { z } from 'zod'

export const PartyLedgerPaymentInput = z.object({
  partyType: z.enum(['customer', 'supplier']),
  partyId: z.string().uuid(),
  entryDate: z.string().date(),
  amount: z.number().positive().max(10_000_000),
  paymentMode: z.enum(['cash', 'upi']),
  referenceNo: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1_000).optional(),
  allocations: z.array(z.object({
    saleId: z.string().uuid(),
    amount: z.number().positive().max(10_000_000)
  })).default([]),
  supplierAllocations: z.array(z.object({
    purchaseId: z.string().uuid(),
    amount: z.number().positive().max(10_000_000)
  })).default([])
}).superRefine((data, context) => {
  if (data.partyType !== 'customer' && data.allocations.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Only customer receipts can be allocated to invoices', path: ['allocations'] })
  }
  const duplicate = data.allocations.some((allocation, index) => data.allocations.findIndex((other) => other.saleId === allocation.saleId) !== index)
  if (duplicate) context.addIssue({ code: z.ZodIssueCode.custom, message: 'An invoice can be allocated only once per receipt', path: ['allocations'] })
  if (data.allocations.length) {
    const allocated = data.allocations.reduce((total, allocation) => total + allocation.amount, 0)
    if (Math.abs(allocated - data.amount) > 0.005) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Allocated invoice amounts must equal the receipt amount', path: ['allocations'] })
    }
  }
  if (data.partyType !== 'supplier' && data.supplierAllocations.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Only supplier payments can be allocated to purchases', path: ['supplierAllocations'] })
  const duplicatePurchase = data.supplierAllocations.some((allocation, index) => data.supplierAllocations.findIndex((other) => other.purchaseId === allocation.purchaseId) !== index)
  if (duplicatePurchase) context.addIssue({ code: z.ZodIssueCode.custom, message: 'A purchase can be allocated only once per payment', path: ['supplierAllocations'] })
  if (data.supplierAllocations.length) {
    const allocated = data.supplierAllocations.reduce((total, allocation) => total + allocation.amount, 0)
    if (Math.abs(allocated - data.amount) > 0.005) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Allocated purchase amounts must equal the payment amount', path: ['supplierAllocations'] })
  }
})
