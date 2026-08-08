import { requireUser } from '../../utils/auth-guard'
import { expensesService } from '../../services/expenses.service'
import { ExpenseInput } from '../../utils/validation/expense'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const parsed = ExpenseInput.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const row = await expensesService.record(parsed.data, user.id)
  setResponseStatus(event, 201)
  return row
})
