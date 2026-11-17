import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required').max(255),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(true)
});

export const registerSchema = z.object({
  email: z.string().trim().email('Valid email address is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters in length'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  rememberMe: z.boolean().optional().default(true)
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
