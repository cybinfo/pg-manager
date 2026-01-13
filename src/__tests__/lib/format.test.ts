/**
 * Tests for formatting utilities
 */

import {
  formatCurrency,
  formatCurrencyPrecise,
  formatCurrencyCompact,
  parseCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatPhone,
  truncate,
  capitalize,
  toTitleCase,
  sanitizeFilename,
  createContentDisposition,
} from '@/lib/format'

describe('Currency Formatting', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts correctly', () => {
      expect(formatCurrency(1000)).toBe('₹1,000')
      expect(formatCurrency(150000)).toBe('₹1,50,000')
      expect(formatCurrency(10000000)).toBe('₹1,00,00,000')
    })

    it('handles zero', () => {
      expect(formatCurrency(0)).toBe('₹0')
    })

    it('handles null and undefined', () => {
      expect(formatCurrency(null)).toBe('₹0')
      expect(formatCurrency(undefined)).toBe('₹0')
    })

    it('handles negative amounts', () => {
      expect(formatCurrency(-1000)).toBe('-₹1,000')
    })
  })

  describe('formatCurrencyPrecise', () => {
    it('formats with decimals', () => {
      expect(formatCurrencyPrecise(1500.50)).toBe('₹1,500.50')
      expect(formatCurrencyPrecise(1000)).toBe('₹1,000.00')
    })

    it('handles null and undefined', () => {
      expect(formatCurrencyPrecise(null)).toBe('₹0.00')
      expect(formatCurrencyPrecise(undefined)).toBe('₹0.00')
    })
  })

  describe('formatCurrencyCompact', () => {
    it('formats thousands as K', () => {
      expect(formatCurrencyCompact(1500)).toBe('₹1.5K')
      expect(formatCurrencyCompact(50000)).toBe('₹50.0K')
    })

    it('formats lakhs as L', () => {
      expect(formatCurrencyCompact(150000)).toBe('₹1.5L')
      expect(formatCurrencyCompact(5000000)).toBe('₹50.0L')
    })

    it('formats crores as Cr', () => {
      expect(formatCurrencyCompact(15000000)).toBe('₹1.5Cr')
      expect(formatCurrencyCompact(100000000)).toBe('₹10.0Cr')
    })

    it('handles small amounts', () => {
      expect(formatCurrencyCompact(500)).toBe('₹500')
    })

    it('handles null and undefined', () => {
      expect(formatCurrencyCompact(null)).toBe('₹0')
      expect(formatCurrencyCompact(undefined)).toBe('₹0')
    })
  })

  describe('parseCurrency', () => {
    it('parses currency strings', () => {
      expect(parseCurrency('₹1,50,000')).toBe(150000)
      expect(parseCurrency('₹1,000')).toBe(1000)
    })

    it('handles plain numbers', () => {
      expect(parseCurrency('1000')).toBe(1000)
    })

    it('handles invalid input', () => {
      expect(parseCurrency('abc')).toBe(0)
      expect(parseCurrency('')).toBe(0)
    })
  })
})

describe('Number Formatting', () => {
  describe('formatNumber', () => {
    it('formats with Indian number system', () => {
      expect(formatNumber(150000)).toBe('1,50,000')
      expect(formatNumber(10000000)).toBe('1,00,00,000')
    })

    it('handles null and undefined', () => {
      expect(formatNumber(null)).toBe('0')
      expect(formatNumber(undefined)).toBe('0')
    })
  })

  describe('formatPercent', () => {
    it('formats percentages correctly', () => {
      expect(formatPercent(0.856)).toBe('85.6%')
      expect(formatPercent(0.5)).toBe('50.0%')
      expect(formatPercent(1)).toBe('100.0%')
    })

    it('handles custom decimals', () => {
      expect(formatPercent(0.8567, 2)).toBe('85.67%')
    })

    it('handles null and undefined', () => {
      expect(formatPercent(null)).toBe('0%')
      expect(formatPercent(undefined)).toBe('0%')
    })
  })
})

describe('Date Formatting', () => {
  describe('formatDate', () => {
    it('formats date strings', () => {
      const result = formatDate('2024-01-15')
      expect(result).toMatch(/15.*Jan.*2024/)
    })

    it('formats Date objects', () => {
      const result = formatDate(new Date('2024-06-20'))
      expect(result).toMatch(/20.*Jun.*2024/)
    })

    it('handles null and undefined', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
    })
  })
})

describe('Phone Formatting', () => {
  describe('formatPhone', () => {
    it('formats 10-digit numbers', () => {
      expect(formatPhone('9876543210')).toBe('+91 98765 43210')
    })

    it('formats numbers with country code', () => {
      expect(formatPhone('919876543210')).toBe('+91 98765 43210')
    })

    it('handles null and undefined', () => {
      expect(formatPhone(null)).toBe('-')
      expect(formatPhone(undefined)).toBe('-')
    })

    it('returns as-is for non-standard formats', () => {
      expect(formatPhone('12345')).toBe('12345')
    })
  })
})

describe('Text Formatting', () => {
  describe('truncate', () => {
    it('truncates long text', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...')
    })

    it('returns short text unchanged', () => {
      expect(truncate('Hi', 5)).toBe('Hi')
    })

    it('handles null and undefined', () => {
      expect(truncate(null, 5)).toBe('')
      expect(truncate(undefined, 5)).toBe('')
    })
  })

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('HELLO')).toBe('Hello')
    })

    it('handles null and undefined', () => {
      expect(capitalize(null)).toBe('')
      expect(capitalize(undefined)).toBe('')
    })
  })

  describe('toTitleCase', () => {
    it('converts snake_case to Title Case', () => {
      expect(toTitleCase('room_type')).toBe('Room Type')
    })

    it('converts kebab-case to Title Case', () => {
      expect(toTitleCase('room-type')).toBe('Room Type')
    })

    it('handles null and undefined', () => {
      expect(toTitleCase(null)).toBe('')
      expect(toTitleCase(undefined)).toBe('')
    })
  })
})

describe('Filename Sanitization (SEC-018)', () => {
  describe('sanitizeFilename', () => {
    it('removes dangerous characters', () => {
      expect(sanitizeFilename('file<script>')).toBe('filescript')
      expect(sanitizeFilename('file:name')).toBe('filename')
      expect(sanitizeFilename('file/path')).toBe('filepath')
    })

    it('replaces spaces with dashes', () => {
      expect(sanitizeFilename('my file name')).toBe('my-file-name')
    })

    it('handles special characters', () => {
      expect(sanitizeFilename("John's Report")).toBe('john-s-report')
    })

    it('handles empty input', () => {
      expect(sanitizeFilename('')).toBe('file')
    })

    it('limits length', () => {
      const longName = 'a'.repeat(200)
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(100)
    })
  })

  describe('createContentDisposition', () => {
    it('creates attachment header', () => {
      expect(createContentDisposition('report.pdf')).toBe('attachment; filename="report.pdf"')
    })

    it('creates inline header', () => {
      expect(createContentDisposition('image.png', true)).toBe('inline; filename="image.png"')
    })

    it('sanitizes filename in header', () => {
      expect(createContentDisposition("John's Report.pdf")).toBe('attachment; filename="john-s-report.pdf"')
    })
  })
})
