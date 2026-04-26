import {
  PROPERTY_FILTER,
  FLOOR_FILTER,
  ROOM_TYPE_FILTER,
  LIBRARY_FILTER,
  TIME_SLOT_FILTER,
  LIBRARY_AC_TYPE_FILTER,
  PAYMENT_METHOD_FILTER,
  ACTIVE_STATUS_FILTER,
  COMPLAINT_STATUS_FILTER,
  NOTICE_TYPE_FILTER,
  REFUND_TYPE_FILTER,
  BILL_STATUS_FILTER,
  EXIT_CLEARANCE_STATUS_FILTER,
  APPROVAL_STATUS_FILTER,
  createStatusFilter,
  createDateRangeFilter,
  createDateFilter,
} from '@/lib/filter-presets'

// Utility: check that a FilterConfig has required base fields
function expectValidFilter(filter: ReturnType<typeof createStatusFilter>) {
  expect(typeof filter.id).toBe('string')
  expect(filter.id.length).toBeGreaterThan(0)
  expect(typeof filter.label).toBe('string')
  expect(typeof filter.type).toBe('string')
}

describe('Static filter presets', () => {
  describe('PROPERTY_FILTER', () => {
    it('has correct id and type', () => {
      expect(PROPERTY_FILTER.id).toBe('property')
      expect(PROPERTY_FILTER.type).toBe('select')
    })

    it('has no hardcoded options (dynamic)', () => {
      expect(PROPERTY_FILTER.options).toBeUndefined()
    })
  })

  describe('FLOOR_FILTER', () => {
    it('has correct id and type', () => {
      expect(FLOOR_FILTER.id).toBe('floor')
      expect(FLOOR_FILTER.type).toBe('select')
    })
  })

  describe('ROOM_TYPE_FILTER', () => {
    it('has 4 room type options', () => {
      expect(ROOM_TYPE_FILTER.options).toHaveLength(4)
    })

    it('includes single, double, triple, dormitory', () => {
      const values = ROOM_TYPE_FILTER.options!.map((o) => o.value)
      expect(values).toContain('single')
      expect(values).toContain('double')
      expect(values).toContain('triple')
      expect(values).toContain('dormitory')
    })
  })

  describe('LIBRARY_FILTER', () => {
    it('has correct id', () => {
      expect(LIBRARY_FILTER.id).toBe('library_id')
      expect(LIBRARY_FILTER.type).toBe('select')
    })
  })

  describe('TIME_SLOT_FILTER', () => {
    it('has 4 time slot options', () => {
      expect(TIME_SLOT_FILTER.options).toHaveLength(4)
    })

    it('includes Morning, Evening, Night, 24 Hours', () => {
      const values = TIME_SLOT_FILTER.options!.map((o) => o.value)
      expect(values).toContain('Morning')
      expect(values).toContain('Evening')
      expect(values).toContain('Night')
      expect(values).toContain('24 Hours')
    })
  })

  describe('LIBRARY_AC_TYPE_FILTER', () => {
    it('has AC and Non-AC options', () => {
      const values = LIBRARY_AC_TYPE_FILTER.options!.map((o) => o.value)
      expect(values).toContain('true')
      expect(values).toContain('false')
    })
  })

  describe('PAYMENT_METHOD_FILTER', () => {
    it('is a valid filter config', () => {
      expectValidFilter(PAYMENT_METHOD_FILTER)
    })

    it('has options for common payment methods', () => {
      expect(PAYMENT_METHOD_FILTER.options).toBeDefined()
      expect(PAYMENT_METHOD_FILTER.options!.length).toBeGreaterThan(0)
    })
  })

  describe('ACTIVE_STATUS_FILTER', () => {
    it('has active/inactive options', () => {
      expect(ACTIVE_STATUS_FILTER.options).toBeDefined()
      const values = ACTIVE_STATUS_FILTER.options!.map((o) => o.value)
      expect(values).toContain('true')
      expect(values).toContain('false')
    })
  })

  describe('COMPLAINT_STATUS_FILTER', () => {
    it('is a valid select filter', () => {
      expect(COMPLAINT_STATUS_FILTER.type).toBe('select')
      expect(COMPLAINT_STATUS_FILTER.options).toBeDefined()
      expect(COMPLAINT_STATUS_FILTER.options!.length).toBeGreaterThan(0)
    })
  })

  describe('NOTICE_TYPE_FILTER', () => {
    it('is a valid select filter', () => {
      expect(NOTICE_TYPE_FILTER.type).toBe('select')
      expect(NOTICE_TYPE_FILTER.options).toBeDefined()
    })
  })

  describe('REFUND_TYPE_FILTER', () => {
    it('is a valid select filter', () => {
      expect(REFUND_TYPE_FILTER.type).toBe('select')
      expect(REFUND_TYPE_FILTER.options).toBeDefined()
    })
  })

  describe('BILL_STATUS_FILTER', () => {
    it('has bill status options', () => {
      expect(BILL_STATUS_FILTER.options).toBeDefined()
      expect(BILL_STATUS_FILTER.options!.length).toBeGreaterThan(0)
    })
  })

  describe('EXIT_CLEARANCE_STATUS_FILTER', () => {
    it('is a valid filter', () => {
      expectValidFilter(EXIT_CLEARANCE_STATUS_FILTER)
    })
  })

  describe('APPROVAL_STATUS_FILTER', () => {
    it('is a valid filter', () => {
      expectValidFilter(APPROVAL_STATUS_FILTER)
    })
  })
})

describe('createStatusFilter', () => {
  it('creates a filter with the provided options', () => {
    const options = [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]
    const filter = createStatusFilter(options)
    expect(filter.id).toBe('status')
    expect(filter.type).toBe('select')
    expect(filter.options).toEqual(options)
  })

  it('uses custom id from overrides', () => {
    const filter = createStatusFilter(
      [{ value: 'open', label: 'Open' }],
      { id: 'settlement_status', label: 'Settlement Status' }
    )
    expect(filter.id).toBe('settlement_status')
    expect(filter.label).toBe('Settlement Status')
  })

  it('preserves all provided options', () => {
    const options = [
      { value: 'pending', label: 'Pending' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
    ]
    const filter = createStatusFilter(options)
    expect(filter.options).toHaveLength(3)
  })

  it('applies overrides on top of defaults', () => {
    const filter = createStatusFilter(
      [{ value: 'open', label: 'Open' }],
      { placeholder: 'Choose Status' }
    )
    expect(filter.placeholder).toBe('Choose Status')
    expect(filter.id).toBe('status') // default preserved
  })
})

describe('createDateRangeFilter', () => {
  it('creates a date-range filter with given id and label', () => {
    const filter = createDateRangeFilter('payment_date', 'Payment Date')
    expect(filter.id).toBe('payment_date')
    expect(filter.label).toBe('Payment Date')
    expect(filter.type).toBe('date-range')
  })

  it('defaults label to "Date" when not provided', () => {
    const filter = createDateRangeFilter('created_at')
    expect(filter.label).toBe('Date')
  })

  it('has no options (date-range has no predefined values)', () => {
    const filter = createDateRangeFilter('created_at', 'Created')
    expect(filter.options).toBeUndefined()
  })
})

describe('createDateFilter', () => {
  it('creates a date filter with given id and label', () => {
    const filter = createDateFilter('attendance_date', 'Attendance Date')
    expect(filter.id).toBe('attendance_date')
    expect(filter.label).toBe('Attendance Date')
    expect(filter.type).toBe('date')
  })

  it('defaults label to "Date"', () => {
    const filter = createDateFilter('date_field')
    expect(filter.label).toBe('Date')
  })

  it('uses custom placeholder', () => {
    const filter = createDateFilter('date', 'Date', 'Pick a date')
    expect(filter.placeholder).toBe('Pick a date')
  })

  it('defaults placeholder to "Select date"', () => {
    const filter = createDateFilter('date', 'Date')
    expect(filter.placeholder).toBe('Select date')
  })
})
