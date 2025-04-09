// frontend/src/features/auth/types.ts
import { z } from 'zod';

// Zod schema for login form validation
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Zod schema for signup form validation
export const signupSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    organizationName: z.string().min(1, { message: "Organization name is required" }),
});

// Infer types from Zod schemas
export type LoginCredentials = z.infer<typeof loginSchema>;
export type SignupCredentials = z.infer<typeof signupSchema>;