import { z } from 'zod'

export const PasswordInput = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')

export const CreateUserInput = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email(),
  password: PasswordInput,
  role: z.enum(['owner', 'staff', 'accountant_readonly'])
})

export type CreateUserInputType = z.infer<typeof CreateUserInput>

export const UpdateUserInput = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: z.string().email().optional(),
  password: PasswordInput.optional(),
  currentPassword: z.string().min(1).optional(),
  role: z.enum(['owner', 'staff', 'accountant_readonly']).optional()
}).superRefine((input, context) => {
  if (!input.name && !input.email && !input.password && !input.role) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one account field must be changed' })
  }
})

export type UpdateUserInputType = z.infer<typeof UpdateUserInput>
