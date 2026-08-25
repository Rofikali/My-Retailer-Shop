import argon2 from 'argon2'
import { db } from '../db/client'
import { UsersRepo } from '../repositories/users.repo'
import type { CreateUserInputType, UpdateUserInputType } from '../utils/validation/user'

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

  async update(id: string, input: UpdateUserInputType, actorId: string) {
    const target = await this.repo.findById(id)
    if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

    const isSelf = target.id === actorId
    if (isSelf && input.role && input.role !== target.role) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot change your own role' })
    }
    if (isSelf && (input.email || input.password)) {
      if (!input.currentPassword || !(await argon2.verify(target.passwordHash, input.currentPassword))) {
        throw createError({ statusCode: 400, statusMessage: 'Your current password is required to change email or password' })
      }
    }
    if (input.email && input.email !== target.email) {
      const existing = await this.repo.findByEmail(input.email)
      if (existing && existing.id !== target.id) {
        throw createError({ statusCode: 409, statusMessage: 'A user with this email already exists' })
      }
    }
    if (target.role === 'owner' && input.role && input.role !== 'owner' && target.isActive && await this.repo.countActiveOwners() <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'At least one active owner account is required' })
    }

    return this.repo.update(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.password ? { passwordHash: await argon2.hash(input.password) } : {})
    })
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    const target = await this.repo.findById(id)
    if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    if (target.id === actorId) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot disable your own account' })
    }
    if (!isActive && target.role === 'owner' && target.isActive && await this.repo.countActiveOwners() <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'At least one active owner account is required' })
    }
    return this.repo.setActive(id, isActive)
  }
}

export const usersService = new UsersService()
