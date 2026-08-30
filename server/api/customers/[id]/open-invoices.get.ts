import { z } from 'zod'
import { requireUser } from '../../../utils/auth-guard'
import { CustomerReceivablesService } from '../../../services/customer-receivables.service'
import { db } from '../../../db/client'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const customerId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!customerId.success) throw createError({ statusCode: 400, statusMessage: 'Invalid customer ID' })
  return new CustomerReceivablesService(db).listOpenInvoices(customerId.data)
})
