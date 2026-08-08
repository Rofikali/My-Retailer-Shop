import { db } from '../db/client'
import { BusinessProfileRepo } from '../repositories/businessProfile.repo'
import type { BusinessProfileInputType } from '../utils/validation/businessProfile'

export class BusinessProfileService {
  private repo: BusinessProfileRepo

  constructor(database = db) {
    this.repo = new BusinessProfileRepo(database)
  }

  get() {
    return this.repo.get()
  }

  async update(input: BusinessProfileInputType) {
    const existing = await this.repo.get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No business profile row exists yet - run `pnpm run db:seed` first.'
      })
    }
    return this.repo.update(existing.id, {
      businessName: input.businessName,
      financialYearStart: input.financialYearStart,
      financialYearEnd: input.financialYearEnd,
      gstRegistered: input.gstRegistered,
      gstin: input.gstRegistered ? input.gstin : null,
      address: input.address
    })
  }
}

export const businessProfileService = new BusinessProfileService()
