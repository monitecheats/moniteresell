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
  game_uid: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .optional(),
  device: z.enum(['iphone', 'android']).optional()
});

const statusEnum = z.enum(['all', 'active', 'expired', 'pending', 'disabled']);

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date;
}

export const subscriptionsQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((value) => (value ? parseInt(value, 10) : 1))
      .pipe(z.number().int().min(1)),
    pageSize: z
      .string()
      .optional()
      .transform((value) => (value ? parseInt(value, 10) : 25))
      .pipe(z.number().int().min(1).max(100)),
    status: z
      .string()
      .optional()
      .transform((value) => value ?? 'all')
      .pipe(statusEnum),
    q: z
      .string()
      .optional()
      .transform((value) => value?.trim())
      .pipe(z.string().min(1).max(256))
      .optional(),
    game_uid: z
      .string()
      .optional()
      .transform((value) => value?.trim())
      .pipe(z.string().min(1).max(128))
      .optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    sort: z
      .string()
      .optional()
      .transform((value) => value ?? 'created_at_desc')
      .pipe(z.enum(['created_at_desc', 'created_at_asc', 'expires_at_desc', 'expires_at_asc']))
  })
  .transform(({ from, to, ...rest }) => ({
    ...rest,
    fromDate: parseDate(from),
    toDate: parseDate(to)
  }));

export type SubscriptionsQuery = z.infer<typeof subscriptionsQuerySchema> & {
  fromDate?: Date;
  toDate?: Date;
};

export const createSubscriptionSchema = z.object({
  gameUid: z.string().min(1).max(128),
  device: z.string().min(1).max(128),
  duration: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(50)
});

export const subscriptionIdSchema = z.object({
  id: z.string().min(1).max(128)
});

export const deviceActionParamsSchema = z.object({
  udid: z.string().min(3).max(128)
});
