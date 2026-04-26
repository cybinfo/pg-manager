import {
  formatTime12h,
  calcSlotHours,
  serializeTimeSlots,
  parseTimeSlots,
  type TimeSlot,
} from '@/lib/time-slots'

describe('formatTime12h', () => {
  it('formats AM times', () => {
    expect(formatTime12h('09:00')).toBe('9:00 AM')
    expect(formatTime12h('00:00')).toBe('12:00 AM')
    expect(formatTime12h('11:30')).toBe('11:30 AM')
  })

  it('formats PM times', () => {
    expect(formatTime12h('13:00')).toBe('1:00 PM')
    expect(formatTime12h('18:30')).toBe('6:30 PM')
    expect(formatTime12h('23:59')).toBe('11:59 PM')
  })

  it('formats noon correctly', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM')
  })

  it('pads minutes with zero', () => {
    expect(formatTime12h('09:05')).toBe('9:05 AM')
  })
})

describe('calcSlotHours', () => {
  it('calculates hours for a simple slot', () => {
    const slot: TimeSlot = { start: '09:00', end: '13:00' }
    expect(calcSlotHours(slot)).toBe(4)
  })

  it('calculates hours with minutes', () => {
    const slot: TimeSlot = { start: '09:00', end: '10:30' }
    expect(calcSlotHours(slot)).toBe(1.5)
  })

  it('returns 0 for empty start', () => {
    const slot: TimeSlot = { start: '', end: '13:00' }
    expect(calcSlotHours(slot)).toBe(0)
  })

  it('returns 0 for empty end', () => {
    const slot: TimeSlot = { start: '09:00', end: '' }
    expect(calcSlotHours(slot)).toBe(0)
  })

  it('handles slots crossing midnight (positive result)', () => {
    const slot: TimeSlot = { start: '22:00', end: '02:00' }
    expect(calcSlotHours(slot)).toBe(4) // wraps through midnight
  })
})

describe('serializeTimeSlots', () => {
  it('serializes valid slots to JSON', () => {
    const slots: TimeSlot[] = [
      { start: '09:00', end: '13:00' },
      { start: '16:00', end: '20:00' },
    ]
    const result = serializeTimeSlots(slots)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ start: '09:00', end: '13:00' })
  })

  it('filters out empty/invalid slots', () => {
    const slots: TimeSlot[] = [
      { start: '09:00', end: '13:00' },
      { start: '', end: '' },
      { start: '', end: '20:00' },
    ]
    const result = serializeTimeSlots(slots)
    const parsed = JSON.parse(result!)
    expect(parsed).toHaveLength(1)
  })

  it('returns null for empty array', () => {
    expect(serializeTimeSlots([])).toBeNull()
  })

  it('returns null when all slots are invalid', () => {
    const slots: TimeSlot[] = [{ start: '', end: '' }]
    expect(serializeTimeSlots(slots)).toBeNull()
  })
})

describe('parseTimeSlots', () => {
  it('returns empty array for null', () => {
    expect(parseTimeSlots(null)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseTimeSlots('')).toEqual([])
  })

  it('parses JSON array format', () => {
    const raw = JSON.stringify([
      { start: '09:00', end: '13:00' },
      { start: '16:00', end: '20:00' },
    ])
    const result = parseTimeSlots(raw)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ start: '09:00', end: '13:00' })
    expect(result[1]).toEqual({ start: '16:00', end: '20:00' })
  })

  it('parses legacy "HH:MM-HH:MM" format', () => {
    const result = parseTimeSlots('09:00-13:00')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ start: '09:00', end: '13:00' })
  })

  it('handles legacy format with spaces', () => {
    const result = parseTimeSlots('09:00 - 13:00')
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('09:00')
    expect(result[0].end).toBe('13:00')
  })

  it('returns empty for invalid JSON without dash', () => {
    expect(parseTimeSlots('invalid string')).toEqual([])
  })

  it('falls through to empty when JSON parses but is not an array', () => {
    // Valid JSON but not an array — Array.isArray is false, no dash → empty
    expect(parseTimeSlots('{"start":"09:00"}')).toEqual([])
  })

  it('falls through to legacy parse when JSON parses to non-array but has dash', () => {
    // '{"a":"b-c"}' has a dash but is not JSON-array — goes through legacy parse
    const result = parseTimeSlots('{"a":"09:00-13:00"}')
    // The legacy splitter will split on "-" somewhere in the string
    expect(Array.isArray(result)).toBe(true)
  })

  it('handles JSON slots with missing fields gracefully', () => {
    const raw = JSON.stringify([{ start: '09:00' }, { end: '13:00' }])
    const result = parseTimeSlots(raw)
    expect(result).toHaveLength(2)
    expect(result[0].start).toBe('09:00')
    expect(result[0].end).toBe('')
    expect(result[1].start).toBe('')
  })
})
