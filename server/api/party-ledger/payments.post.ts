import { randomUUID } from 'node:crypto'
import { db } from '../../db/client'
import { requireUser } from '../../utils/auth-guard'
import { LedgerService } from '../../services/ledger.service'
import { PartyLedgerService } from '../../services/party-ledger.service'
import { PartyLedgerPaymentInput } from '../../utils/validation/partyLedgerPayment'
import { CustomerReceivablesService } from '../../services/customer-receivables.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = PartyLedgerPaymentInput.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid payment entry', data: parsed.error.flatten() })

  const input = parsed.data
  const referenceId = randomUUID()
  const voucherNo = `${input.partyType === 'customer' ? 'REC' : 'PAY'}-${referenceId.slice(0, 8).toUpperCase()}`
  const description = input.partyType === 'customer' ? `Receipt ${voucherNo}` : `Payment ${voucherNo}`

  await db.transaction(async (tx) => {
    const dbTx = tx as unknown as typeof db
    const ledger = new LedgerService(db)
    const partyLedger = new PartyLedgerService(db)
    const receivables = new CustomerReceivablesService(db)

    if (input.partyType === 'customer') {
      await ledger.post(dbTx, [
        { accountCode: 'CASH', debit: input.amount },
        { accountCode: 'DEBTORS', credit: input.amount, customerId: input.partyId }
      ], { entryDate: input.entryDate, description, referenceType: 'journal', referenceId, createdBy: user.id })
      const receipt = await partyLedger.post(dbTx, {
        entryDate: input.entryDate, voucherNo, customerId: input.partyId, particulars: description,
        debit: '0', credit: String(input.amount), paymentMode: input.paymentMode, referenceType: 'journal', referenceId,
        referenceNo: input.referenceNo || null, status: 'posted', remarks: input.remarks || null, createdBy: user.id, approvedBy: user.id
      })
      if (!receipt) throw createError({ statusCode: 500, statusMessage: 'Receipt ledger event was not created' })
      await receivables.allocateReceipt(dbTx, receipt.id, input.partyId, input.amount, input.allocations, user.id)
    } else {
      await ledger.post(dbTx, [
        { accountCode: 'CREDITORS', debit: input.amount, supplierId: input.partyId },
        { accountCode: 'CASH', credit: input.amount }
      ], { entryDate: input.entryDate, description, referenceType: 'journal', referenceId, createdBy: user.id })
      await partyLedger.post(dbTx, {
        entryDate: input.entryDate, voucherNo, supplierId: input.partyId, particulars: description,
        debit: String(input.amount), credit: '0', paymentMode: input.paymentMode, referenceType: 'journal', referenceId,
        referenceNo: input.referenceNo || null, status: 'posted', remarks: input.remarks || null, createdBy: user.id, approvedBy: user.id
      })
    }
  })

  setResponseStatus(event, 201)
  return { referenceId, voucherNo }
})
