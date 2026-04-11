import { z } from 'zod'
import type { RewardItemType, RewardTier } from '../types'

export const OTP_PATTERN = /^\d{4,8}$/
export const PHONE_PATTERN = /^[0-9]{10}$/

const allowedPasswordSymbols = new Set(['@', '$', '!', '%', '*', '?', '&'])

export const isValidName = (value: string) => {
  if (!value || value.length > 100) return false
  let previousWasSeparator = true

  for (const char of value) {
    const isLetter = (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')
    const isSeparator = char === ' ' || char === '\'' || char === '-'

    if (isLetter) {
      previousWasSeparator = false
      continue
    }
    if (isSeparator && !previousWasSeparator) {
      previousWasSeparator = true
      continue
    }
    return false
  }

  return !previousWasSeparator
}

export const isValidEmail = (value: string) => {
  if (!value || value.length > 254 || value.includes(' ')) return false

  const atIndex = value.indexOf('@')
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) return false

  const local = value.slice(0, atIndex)
  const domain = value.slice(atIndex + 1)
  if (!local || !domain || domain.startsWith('.') || domain.endsWith('.')) return false

  const lastDotIndex = domain.lastIndexOf('.')
  return lastDotIndex > 0 && lastDotIndex < domain.length - 1
}

export const hasPasswordComplexity = (value: string) => {
  let hasLower = false
  let hasUpper = false
  let hasDigit = false
  let hasSymbol = false

  for (const char of value) {
    hasLower ||= char >= 'a' && char <= 'z'
    hasUpper ||= char >= 'A' && char <= 'Z'
    hasDigit ||= char >= '0' && char <= '9'
    hasSymbol ||= allowedPasswordSymbols.has(char)
  }

  return hasLower && hasUpper && hasDigit && hasSymbol
}

export const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')
export const digitsOnly = (value: string) => value.replace(/\D/g, '')

const trimmedRequiredString = (message: string) =>
  z.string().transform(value => value.trim()).pipe(z.string().min(1, message))

export const emailSchema = trimmedRequiredString('Email address is required')
  .refine(isValidEmail, 'Invalid email address')

export const loginPasswordSchema = trimmedRequiredString('Password is required')

export const otpSchema = trimmedRequiredString('OTP is required')
  .refine(value => OTP_PATTERN.test(value), 'Enter a valid OTP')

export const fullNameSchema = z.string()
  .transform(normalizeWhitespace)
  .pipe(
    z.string()
      .min(2, 'At least 2 characters required')
      .max(100, 'Full name must be 100 characters or fewer')
      .refine(isValidName, 'Name must contain letters only')
  )

export const phoneSchema = z.string()
  .transform(digitsOnly)
  .pipe(z.string().regex(PHONE_PATTERN, 'Phone number must be exactly 10 digits'))

export const optionalPhoneSchema = z.string()
  .transform(digitsOnly)
  .refine(value => value === '' || PHONE_PATTERN.test(value), 'Phone number must be exactly 10 digits')

export const strongPasswordSchema = z.string()
  .min(8, 'Minimum 8 characters')
  .refine(hasPasswordComplexity, 'Must include A-Z, a-z, 0-9, and @$!%*?&')

export const signupSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: strongPasswordSchema,
  confirm: z.string(),
}).refine(values => values.password === values.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

export const forgotPasswordResetSchema = z.object({
  newPassword: strongPasswordSchema,
  confirmPassword: z.string(),
}).refine(values => values.newPassword === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const profileSchema = z.object({
  name: fullNameSchema,
  phone: optionalPhoneSchema,
})

export const profilePhotoSchema = z.instanceof(File)
  .refine(file => file.type.startsWith('image/'), 'Please choose an image file (JPG, PNG, WEBP).')
  .refine(file => file.size <= 2 * 1024 * 1024, 'Image size should be up to 2MB.')

export const kycDocumentNumberSchema = trimmedRequiredString('Enter your document number')

export const kycFileSchema = z.instanceof(File)
  .superRefine((file: File, ctx) => {
    if (file.size > 5 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
      ctx.addIssue({
        code: 'custom',
        message: `File is ${sizeMb}MB. Maximum allowed is 5MB.`,
      })
    }
  })

export const topupAmountSchema = z.coerce.number()
  .refine(value => Number.isFinite(value) && value >= 1, 'Enter a valid amount')

export const baseTransferSchema = z.object({
  receiverId: z.coerce.number()
    .int()
    .positive('Select a recipient or enter a receiver ID'),
  amount: z.coerce.number()
    .refine(value => Number.isFinite(value) && value >= 1 && value <= 25000, 'Amount must be Rs1-Rs25,000'),
  description: z.string().max(250, 'Note must be 250 characters or fewer').optional().or(z.literal('')),
})

export const createTransferSchema = (currentUserId?: number) => baseTransferSchema.refine(
  values => values.receiverId !== currentUserId,
  { message: 'You cannot transfer money to your own account', path: ['receiverId'] }
)

export const baseWithdrawSchema = z.object({
  amount: z.coerce.number().refine(value => Number.isFinite(value) && value >= 1, 'Enter a valid amount'),
})

export const createWithdrawSchema = (balance = 0) => baseWithdrawSchema.refine(
  values => values.amount <= balance,
  { message: 'Insufficient balance', path: ['amount'] }
)

export const createRewardPointsSchema = (availablePoints = 0) => z.object({
  points: z.coerce.number()
    .int()
    .positive('Enter valid points')
    .refine(value => value <= availablePoints, 'Insufficient points'),
})

export const transactionDateRangeSchema = z.object({
  from: z.string().min(1, 'Select a date range'),
  to: z.string().min(1, 'Select a date range'),
}).refine(values => values.from <= values.to, {
  message: 'From date cannot be after to date',
  path: ['to'],
})

export const rejectionReasonSchema = trimmedRequiredString('Provide a rejection reason')
export const roleSelectionSchema = trimmedRequiredString('Select a role')

export const adminCatalogSchema = z.object({
  name: trimmedRequiredString('Reward name is required')
    .refine(value => value.length >= 3, 'Reward name must be at least 3 characters')
    .refine(value => value.length <= 100, 'Reward name must be 100 characters or fewer'),
  description: z.string().transform(value => value.trim()).optional().or(z.literal('')),
  pointsRequired: z.coerce.number().int().positive('Points required must be greater than 0'),
  type: z.enum(['CASHBACK', 'COUPON', 'VOUCHER'] satisfies [RewardItemType, ...RewardItemType[]], {
    message: 'Select a reward type',
  }),
  cashbackAmount: z.union([z.literal(''), z.coerce.number().positive('Cashback amount must be greater than 0')]),
  tierRequired: z.union([z.literal(''), z.enum(['SILVER', 'GOLD', 'PLATINUM'] satisfies [RewardTier, ...RewardTier[]])]),
  stock: z.coerce.number().int().positive('Stock must be greater than 0'),
  expiryDays: z.union([z.literal(''), z.coerce.number().int().positive('Expiry days must be greater than 0')]),
  active: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.type === 'CASHBACK' && values.cashbackAmount === '') {
    ctx.addIssue({ code: 'custom', path: ['cashbackAmount'], message: 'Cashback amount is required for cashback rewards' })
  }
})

export const getFirstError = (error: z.ZodError): string => error.issues[0]?.message || 'Invalid input'

export const getFieldErrors = <T extends Record<string, unknown>>(error: z.ZodError<T>) =>
  error.flatten().fieldErrors as Partial<Record<keyof T, string[]>>

export const getFieldError = <T>(schema: z.ZodType<T>, value: unknown) => {
  const result = schema.safeParse(value)
  return result.success ? '' : getFirstError(result.error)
}
