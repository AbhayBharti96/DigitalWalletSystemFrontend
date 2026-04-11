import { describe, expect, it } from 'vitest'
import {
  emailSchema,
  fullNameSchema,
  hasPasswordComplexity,
  isValidEmail,
  isValidName,
  phoneSchema,
  strongPasswordSchema,
} from '@/shared/validation'

describe('shared/validation', () => {
  it('normal working: accepts valid profile and auth inputs', () => {
    expect(fullNameSchema.parse(' Priya   Sharma ')).toBe('Priya Sharma')
    expect(emailSchema.parse('priya@example.com')).toBe('priya@example.com')
    expect(phoneSchema.parse('99999 99999')).toBe('9999999999')
    expect(strongPasswordSchema.parse('Secret@123')).toBe('Secret@123')
  })

  it('boundary value: accepts names with supported separators and minimum email parts', () => {
    expect(isValidName("Asha-Marie D'Souza")).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(hasPasswordComplexity('Aa1@aaaa')).toBe(true)
  })

  it('exception handling: rejects malformed names, email, phone, and weak password values', () => {
    expect(fullNameSchema.safeParse('Priya -- Sharma').success).toBe(false)
    expect(emailSchema.safeParse('missing-at.example.com').success).toBe(false)
    expect(phoneSchema.safeParse('12345').success).toBe(false)
    expect(strongPasswordSchema.safeParse('password').success).toBe(false)
  })
})
