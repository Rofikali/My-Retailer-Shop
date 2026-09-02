import { z } from 'zod'
import { requireUser } from '../../../utils/auth-guard'
import { db } from '../../../db/client'
import { SupplierPayablesService } from '../../../services/supplier-payables.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: 'Invalid supplier ID' })
  return new SupplierPayablesService(db).listOpenPurchases(id.data)
})
