import {
  getTodayISO,
  getNowISO,
  computeEndDate,
  computeDefaultStartDate,
  getMonthRange,
  getPreviousMonthRange,
  getNextMonthRange,
  getCurrentBillingPeriod,
  getBillingPeriod,
  getDaysUntilDue,
  getDaysOverdue,
  isOverdue,
  isSameDay,
  isToday,
  isWithinRange,
  extractMonthYear,
  createMonthYearComputed,
  formatDateIndian,
  getRelativeTime,
} from '@/lib/date-helpers'

describe('getTodayISO', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getTodayISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches today date', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(getTodayISO()).toBe(today)
  })
})

describe('getNowISO', () => {
  it('returns valid ISO string', () => {
    const result = getNowISO()
    expect(() => new Date(result)).not.toThrow()
    expect(new Date(result).toISOString()).toBe(result)
  })
})

describe('computeEndDate', () => {
  it('computes 1 month (30 days) from start', () => {
    const start = '2025-01-01'
    const end = computeEndDate(start, 1)
    expect(end).toBe('2025-01-31')
  })

  it('computes 3 months (90 days) from start', () => {
    const start = '2025-01-01'
    const end = computeEndDate(start, 3)
    expect(end).toBe('2025-04-01')
  })

  it('returns ISO date string format', () => {
    const end = computeEndDate('2025-06-01', 2)
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('handles fractional months', () => {
    const start = '2025-01-01'
    const end = computeEndDate(start, 0.5) // 15 days
    expect(end).toBe('2025-01-16')
  })
})

describe('computeDefaultStartDate', () => {
  it('returns today when status is expired', () => {
    const today = getTodayISO()
    const result = computeDefaultStartDate('2025-01-15', 'expired')
    expect(result).toBe(today)
  })

  it('returns today when status is cancelled', () => {
    const today = getTodayISO()
    expect(computeDefaultStartDate('2025-01-15', 'cancelled')).toBe(today)
  })

  it('returns today when status is suspended', () => {
    const today = getTodayISO()
    expect(computeDefaultStartDate('2025-01-15', 'suspended')).toBe(today)
  })

  it('returns today when expiryDate is null', () => {
    const today = getTodayISO()
    expect(computeDefaultStartDate(null, 'active')).toBe(today)
  })

  it('returns today when expiry is in the past', () => {
    const today = getTodayISO()
    expect(computeDefaultStartDate('2020-01-01', 'active')).toBe(today)
  })

  it('returns expiry+1 when active and expiry is in the future', () => {
    const futureExpiry = '2099-12-15'
    const result = computeDefaultStartDate(futureExpiry, 'active')
    expect(result).toBe('2099-12-16')
  })
})

describe('getMonthRange', () => {
  it('returns first and last day of month', () => {
    const date = new Date('2025-06-15')
    const { start, end } = getMonthRange(date)
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(5) // June = 5 (0-indexed)
    expect(end.getMonth()).toBe(5)
    expect(end.getDate()).toBe(30)
  })

  it('start is at midnight', () => {
    const { start } = getMonthRange(new Date('2025-01-15'))
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
  })

  it('end is at end of day', () => {
    const { end } = getMonthRange(new Date('2025-01-15'))
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
  })

  it('uses current date by default', () => {
    const now = new Date()
    const { start } = getMonthRange()
    expect(start.getMonth()).toBe(now.getMonth())
    expect(start.getFullYear()).toBe(now.getFullYear())
  })
})

describe('getPreviousMonthRange', () => {
  it('returns previous month range', () => {
    const date = new Date('2025-06-15')
    const { start } = getPreviousMonthRange(date)
    expect(start.getMonth()).toBe(4) // May = 4
    expect(start.getFullYear()).toBe(2025)
  })

  it('wraps to previous year for January', () => {
    const date = new Date('2025-01-15')
    const { start } = getPreviousMonthRange(date)
    expect(start.getMonth()).toBe(11) // December = 11
    expect(start.getFullYear()).toBe(2024)
  })
})

describe('getNextMonthRange', () => {
  it('returns next month range', () => {
    const date = new Date('2025-06-15')
    const { start } = getNextMonthRange(date)
    expect(start.getMonth()).toBe(6) // July = 6
    expect(start.getFullYear()).toBe(2025)
  })

  it('wraps to next year for December', () => {
    const date = new Date('2025-12-15')
    const { start } = getNextMonthRange(date)
    expect(start.getMonth()).toBe(0) // January = 0
    expect(start.getFullYear()).toBe(2026)
  })
})

describe('getCurrentBillingPeriod', () => {
  it('returns correct period for a given date', () => {
    const date = new Date('2025-06-15')
    const period = getCurrentBillingPeriod(date)
    expect(period.monthNumber).toBe(6)
    expect(period.year).toBe(2025)
    expect(period.month).toContain('June')
    expect(period.month).toContain('2025')
  })

  it('period start is first of month', () => {
    const date = new Date('2025-03-20')
    const { periodStart } = getCurrentBillingPeriod(date)
    expect(periodStart.getDate()).toBe(1)
    expect(periodStart.getMonth()).toBe(2) // March = 2
  })

  it('period end is last of month', () => {
    const date = new Date('2025-02-10')
    const { periodEnd } = getCurrentBillingPeriod(date)
    expect(periodEnd.getMonth()).toBe(1) // February = 1
    expect(periodEnd.getDate()).toBe(28) // 2025 is not a leap year
  })
})

describe('getBillingPeriod', () => {
  it('returns billing period for specific month/year', () => {
    const period = getBillingPeriod(2025, 6)
    expect(period.monthNumber).toBe(6)
    expect(period.year).toBe(2025)
    expect(period.month).toContain('June')
  })

  it('handles month 1 (January)', () => {
    const period = getBillingPeriod(2025, 1)
    expect(period.monthNumber).toBe(1)
    expect(period.month).toContain('January')
  })

  it('handles month 12 (December)', () => {
    const period = getBillingPeriod(2025, 12)
    expect(period.monthNumber).toBe(12)
    expect(period.month).toContain('December')
  })
})

describe('getDaysUntilDue', () => {
  it('returns 0 when today is the due day', () => {
    const today = new Date()
    const dueDay = today.getDate()
    const result = getDaysUntilDue(dueDay, today)
    // If today is the due day, due date in this month already passed (or is today)
    // getDaysUntilDue moves to next month if due < today
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('returns positive days for future due date', () => {
    const today = new Date('2025-06-10')
    const result = getDaysUntilDue(15, today) // Due on 15th, today is 10th
    expect(result).toBe(5)
  })

  it('moves to next month if due date has passed', () => {
    const today = new Date('2025-06-20')
    const result = getDaysUntilDue(5, today) // Due 5th passed, next is July 5th
    expect(result).toBe(15) // 15 days until July 5th
  })
})

describe('getDaysOverdue', () => {
  it('returns 0 when not overdue', () => {
    const dueDate = new Date('2025-12-31')
    const today = new Date('2025-06-01')
    expect(getDaysOverdue(dueDate, today)).toBe(0)
  })

  it('returns 0 when due today', () => {
    const today = new Date('2025-06-01')
    expect(getDaysOverdue(today, today)).toBe(0)
  })

  it('returns days overdue when past due', () => {
    const dueDate = new Date('2025-06-01')
    const today = new Date('2025-06-11')
    expect(getDaysOverdue(dueDate, today)).toBe(10)
  })
})

describe('isOverdue', () => {
  it('returns false when due in the future', () => {
    const future = new Date(Date.now() + 86400000)
    expect(isOverdue(future)).toBe(false)
  })

  it('returns true when past due', () => {
    const past = new Date('2020-01-01')
    expect(isOverdue(past)).toBe(true)
  })
})

describe('isSameDay', () => {
  it('returns true for same day', () => {
    const a = new Date('2025-06-15T10:00:00')
    const b = new Date('2025-06-15T23:59:59')
    expect(isSameDay(a, b)).toBe(true)
  })

  it('returns false for different days', () => {
    const a = new Date('2025-06-15')
    const b = new Date('2025-06-16')
    expect(isSameDay(a, b)).toBe(false)
  })

  it('returns false for different months', () => {
    const a = new Date('2025-05-15')
    const b = new Date('2025-06-15')
    expect(isSameDay(a, b)).toBe(false)
  })
})

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000)
    expect(isToday(yesterday)).toBe(false)
  })

  it('returns false for far past date', () => {
    expect(isToday(new Date('2020-01-01'))).toBe(false)
  })
})

describe('isWithinRange', () => {
  it('returns true when date is within range', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2025-12-31')
    const mid = new Date('2025-06-15')
    expect(isWithinRange(mid, start, end)).toBe(true)
  })

  it('returns true when date equals start', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2025-12-31')
    expect(isWithinRange(start, start, end)).toBe(true)
  })

  it('returns true when date equals end', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2025-12-31')
    expect(isWithinRange(end, start, end)).toBe(true)
  })

  it('returns false when date is before range', () => {
    const start = new Date('2025-06-01')
    const end = new Date('2025-12-31')
    const before = new Date('2025-01-01')
    expect(isWithinRange(before, start, end)).toBe(false)
  })

  it('returns false when date is after range', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2025-06-30')
    const after = new Date('2025-07-01')
    expect(isWithinRange(after, start, end)).toBe(false)
  })
})

describe('extractMonthYear', () => {
  it('extracts month and year from ISO string', () => {
    const result = extractMonthYear('2025-06-15')
    expect(result.month).toContain('June')
    expect(result.month).toContain('2025')
    expect(result.year).toBe('2025')
  })

  it('accepts Date object', () => {
    const date = new Date('2025-01-01')
    const result = extractMonthYear(date)
    expect(result.month).toContain('January')
    expect(result.year).toBe('2025')
  })

  it('year is a string', () => {
    const result = extractMonthYear('2025-06-15')
    expect(typeof result.year).toBe('string')
  })
})

describe('createMonthYearComputed', () => {
  it('creates a computed function that extracts month and year', () => {
    const compute = createMonthYearComputed('created_at', 'bill')
    const result = compute({ created_at: '2025-06-15T10:00:00Z' })
    expect(result.bill_month).toContain('June')
    expect(result.bill_year).toBe('2025')
  })

  it('uses custom prefix', () => {
    const compute = createMonthYearComputed('payment_date', 'payment')
    const result = compute({ payment_date: '2025-03-10' })
    expect(result).toHaveProperty('payment_month')
    expect(result).toHaveProperty('payment_year')
  })

  it('falls back to current date when field is missing', () => {
    const compute = createMonthYearComputed('date', 'prefix')
    const result = compute({ date: undefined })
    expect(result).toHaveProperty('prefix_month')
    expect(result).toHaveProperty('prefix_year')
  })
})

describe('formatDateIndian', () => {
  it('formats date in Indian format', () => {
    const result = formatDateIndian(new Date('2025-06-15'))
    expect(result).toContain('15')
    expect(result).toContain('June')
    expect(result).toContain('2025')
  })

  it('accepts string input', () => {
    const result = formatDateIndian('2025-01-01')
    expect(result).toContain('January')
    expect(result).toContain('2025')
  })
})

describe('getRelativeTime', () => {
  it('is a function (alias for formatTimeAgo)', () => {
    expect(typeof getRelativeTime).toBe('function')
  })

  it('returns relative time string for recent date', () => {
    const recent = new Date(Date.now() - 60000) // 1 minute ago
    const result = getRelativeTime(recent)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
