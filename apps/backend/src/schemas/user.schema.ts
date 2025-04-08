import { z } from 'zod';

export const addUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export type AddUserInput = z.infer<typeof addUserSchema>['body'];
