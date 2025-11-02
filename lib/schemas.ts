import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .trim()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
  totp: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^[0-9]{6}$/)
    .optional()
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .trim()
      .transform((value) => value.toLowerCase()),
    email: z.string().email(),
    password: z
      .string()
      .min(10)
      .max(128)
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include letters and numbers'),
    repeatPassword: z.string()
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: 'Passwords must match',
    path: ['repeatPassword']
  });

export const metricsQuerySchema = z.object({});

export const recentKeysQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? parseInt(value, 10) : 10))
    .pipe(z.number().min(1).max(50)),
  game_uid: z.string().optional(),
  device: z.string().optional()
});
