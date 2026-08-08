import { requireUser } from '../../utils/auth-guard'
import { productsService } from '../../services/products.service'
import { ProductInput } from '../../utils/validation/product'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readBody(event)
  const parsed = ProductInput.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }
  const row = await productsService.create(parsed.data)
  setResponseStatus(event, 201)
  return row
})
