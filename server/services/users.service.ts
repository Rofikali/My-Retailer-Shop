import argon2 from 'argon2'
import { db } from '../db/client'
import { UsersRepo } from '../repositories/users.repo'
import type { CreateUserInputType } from '../utils/validation/user'

export class UsersService {
  private repo: UsersRepo

  constructor(database = db) {
    this.repo = new UsersRepo(database)
  }

  list() {
    return this.repo.list()
  }

  async create(input: CreateUserInputType) {
    const existing = await this.repo.findByEmail(input.email)
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: 'A user with this email already exists' })
    }
    const passwordHash = await argon2.hash(input.password)
    return this.repo.insert({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role
    })
  }

  setActive(id: string, isActive: boolean) {
    return this.repo.setActive(id, isActive)
  }
}

export const usersService = new UsersService()
