import { db } from '../db/client'
import { ProductsRepo } from '../repositories/products.repo'
import type { ProductInputType } from '../utils/validation/product'

/**
 * No ledger involvement here - creating a product/setting a reorder level isn't a
 * financial event. Kept as a thin service (rather than calling the repo directly from
 * the API route) purely for architectural consistency - see docs/02-HLD.md §4 for why
 * that rule exists even for simple CRUD.
 */
export class ProductsService {
  private repo: ProductsRepo

  constructor(database = db) {
    this.repo = new ProductsRepo(database)
  }

  list(search?: string) {
    return this.repo.list(search)
  }

  async create(input: ProductInputType) {
    const code = await this.repo.nextCode()
    return this.repo.insert({
      code,
      name: input.name,
      category: input.category,
      unit: input.unit,
      reorderLevel: String(input.reorderLevel),
      costPrice: input.costPrice !== undefined ? String(input.costPrice) : undefined,
      sellingPrice: input.sellingPrice !== undefined ? String(input.sellingPrice) : undefined
    })
  }
}

export const productsService = new ProductsService()
