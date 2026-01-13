/**
 * Tests for Indian validators
 */

import {
  validateIndianMobile,
  formatIndianMobile,
  validateEmail,
  validatePAN,
  validateAadhaar,
  validatePincode,
  validateGST,
} from '@/lib/validators'

describe('Indian Mobile Validator', () => {
  describe('validateIndianMobile', () => {
    it('validates 10-digit numbers starting with 6-9', () => {
      expect(validateIndianMobile('9876543210')).toEqual({
        isValid: true,
        normalized: '+919876543210',
        error: null,
      })
      expect(validateIndianMobile('6123456789')).toEqual({
        isValid: true,
        normalized: '+916123456789',
        error: null,
      })
    })

    it('validates numbers with +91 prefix', () => {
      expect(validateIndianMobile('+919876543210')).toEqual({
        isValid: true,
        normalized: '+919876543210',
        error: null,
      })
    })

    it('validates numbers with 91 prefix', () => {
      expect(validateIndianMobile('919876543210')).toEqual({
        isValid: true,
        normalized: '+919876543210',
        error: null,
      })
    })

    it('validates numbers with 0 prefix', () => {
      expect(validateIndianMobile('09876543210')).toEqual({
        isValid: true,
        normalized: '+919876543210',
        error: null,
      })
    })

    it('handles numbers with spaces and dashes', () => {
      expect(validateIndianMobile('98765 43210')).toEqual({
        isValid: true,
        normalized: '+919876543210',
        error: null,
      })
      expect(validateIndianMobile('98765-43210')).toEqual({
        isValid: true,
        normalized: '+919876543210',
        error: null,
      })
    })

    it('rejects numbers not starting with 6-9', () => {
      const result = validateIndianMobile('5876543210')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must start with 6, 7, 8, or 9')
    })

    it('rejects too short numbers', () => {
      const result = validateIndianMobile('98765')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('at least 10 digits')
    })

    it('rejects too long numbers', () => {
      const result = validateIndianMobile('98765432101234567')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('too long')
    })

    it('rejects empty input', () => {
      expect(validateIndianMobile('')).toEqual({
        isValid: false,
        normalized: null,
        error: 'Phone number is required',
      })
    })
  })

  describe('formatIndianMobile', () => {
    it('formats normalized numbers', () => {
      expect(formatIndianMobile('+919876543210')).toBe('+91 98765 43210')
    })

    it('handles empty input', () => {
      expect(formatIndianMobile('')).toBe('')
    })

    it('returns non-standard numbers as-is', () => {
      expect(formatIndianMobile('12345')).toBe('12345')
    })
  })
})

describe('Email Validator', () => {
  describe('validateEmail', () => {
    it('validates correct emails', () => {
      expect(validateEmail('user@example.com')).toEqual({
        isValid: true,
        error: null,
      })
      expect(validateEmail('user.name@domain.co.in')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('rejects invalid formats', () => {
      expect(validateEmail('invalid')).toEqual({
        isValid: false,
        error: 'Invalid email format',
      })
      expect(validateEmail('invalid@')).toEqual({
        isValid: false,
        error: 'Invalid email format',
      })
      expect(validateEmail('@domain.com')).toEqual({
        isValid: false,
        error: 'Invalid email format',
      })
    })

    it('blocks disposable emails when option is set', () => {
      expect(validateEmail('user@mailinator.com', { blockDisposable: true })).toEqual({
        isValid: false,
        error: 'Disposable email addresses are not allowed',
      })
      expect(validateEmail('user@yopmail.com', { blockDisposable: true })).toEqual({
        isValid: false,
        error: 'Disposable email addresses are not allowed',
      })
    })

    it('allows disposable emails when option is not set', () => {
      expect(validateEmail('user@mailinator.com')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('rejects empty input', () => {
      expect(validateEmail('')).toEqual({
        isValid: false,
        error: 'Email is required',
      })
    })
  })
})

describe('PAN Validator', () => {
  describe('validatePAN', () => {
    it('validates correct PAN format', () => {
      expect(validatePAN('ABCDE1234F')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('is case insensitive', () => {
      expect(validatePAN('abcde1234f')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('rejects invalid formats', () => {
      expect(validatePAN('ABC123')).toEqual({
        isValid: false,
        error: 'Invalid PAN format. Expected: AAAAA1234A',
      })
      expect(validatePAN('12345ABCDE')).toEqual({
        isValid: false,
        error: 'Invalid PAN format. Expected: AAAAA1234A',
      })
    })

    it('rejects empty input', () => {
      expect(validatePAN('')).toEqual({
        isValid: false,
        error: 'PAN is required',
      })
    })
  })
})

describe('Aadhaar Validator', () => {
  describe('validateAadhaar', () => {
    it('validates 12-digit numbers', () => {
      expect(validateAadhaar('123456789012')).toEqual({
        isValid: true,
        formatted: '1234 5678 9012',
        error: null,
      })
    })

    it('handles numbers with spaces', () => {
      expect(validateAadhaar('1234 5678 9012')).toEqual({
        isValid: true,
        formatted: '1234 5678 9012',
        error: null,
      })
    })

    it('handles numbers with dashes', () => {
      expect(validateAadhaar('1234-5678-9012')).toEqual({
        isValid: true,
        formatted: '1234 5678 9012',
        error: null,
      })
    })

    it('rejects non-12-digit numbers', () => {
      expect(validateAadhaar('12345')).toEqual({
        isValid: false,
        formatted: null,
        error: 'Aadhaar must be 12 digits',
      })
    })

    it('rejects non-numeric input', () => {
      expect(validateAadhaar('12345678901A')).toEqual({
        isValid: false,
        formatted: null,
        error: 'Aadhaar must contain only digits',
      })
    })

    it('rejects empty input', () => {
      expect(validateAadhaar('')).toEqual({
        isValid: false,
        formatted: null,
        error: 'Aadhaar number is required',
      })
    })
  })
})

describe('Pincode Validator', () => {
  describe('validatePincode', () => {
    it('validates 6-digit pincodes', () => {
      expect(validatePincode('110001')).toEqual({
        isValid: true,
        error: null,
      })
      expect(validatePincode('400001')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('rejects pincodes starting with 0', () => {
      expect(validatePincode('010001')).toEqual({
        isValid: false,
        error: 'Pincode cannot start with 0',
      })
    })

    it('rejects non-6-digit pincodes', () => {
      expect(validatePincode('1234')).toEqual({
        isValid: false,
        error: 'Pincode must be 6 digits',
      })
      expect(validatePincode('12345678')).toEqual({
        isValid: false,
        error: 'Pincode must be 6 digits',
      })
    })

    it('rejects empty input', () => {
      expect(validatePincode('')).toEqual({
        isValid: false,
        error: 'Pincode is required',
      })
    })
  })
})

describe('GST Validator', () => {
  describe('validateGST', () => {
    it('validates correct GST format', () => {
      expect(validateGST('22AAAAA0000A1Z5')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('is case insensitive', () => {
      expect(validateGST('22aaaaa0000a1z5')).toEqual({
        isValid: true,
        error: null,
      })
    })

    it('rejects wrong length', () => {
      expect(validateGST('22AAAAA0000')).toEqual({
        isValid: false,
        error: 'GST number must be 15 characters',
      })
    })

    it('rejects invalid format', () => {
      expect(validateGST('AAAAAAAAAAAAA00')).toEqual({
        isValid: false,
        error: 'Invalid GST number format',
      })
    })

    it('rejects empty input', () => {
      expect(validateGST('')).toEqual({
        isValid: false,
        error: 'GST number is required',
      })
    })
  })
})
