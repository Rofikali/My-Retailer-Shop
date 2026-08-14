import { z } from 'zod'

export const CreateUserInput = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email(),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/\d/, 'Password must include a number'),
  role: z.enum(['owner', 'staff', 'accountant_readonly'])
})

export type CreateUserInputType = z.infer<typeof CreateUserInput>
