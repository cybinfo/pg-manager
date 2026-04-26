import {
  createTotalMetric,
  createStatusMetric,
  createBooleanMetric,
  createNullCheckMetric,
  createSumMetric,
  createCountMetric,
  createTodayCountMetric,
  createThisMonthCountMetric,
  createAverageMetric,
  createExpiringMetric,
} from '@/lib/metric-factories'

// Minimal lucide icon mock
const MockIcon = () => null
MockIcon.displayName = 'MockIcon'

type Item = Record<string, unknown>

describe('createTotalMetric', () => {
  it('creates metric with default options', () => {
    const metric = createTotalMetric()
    expect(metric.id).toBe('total')
    expect(metric.label).toBe('Total')
  })

  it('creates metric with custom options', () => {
    const metric = createTotalMetric({ id: 'count', label: 'All Tenants' })
    expect(metric.id).toBe('count')
    expect(metric.label).toBe('All Tenants')
  })

  it('compute returns the server total', () => {
    const metric = createTotalMetric()
    const result = metric.compute([], 42, {})
    expect(result).toBe(42)
  })

  it('compute returns 0 when total is 0', () => {
    const metric = createTotalMetric()
    expect(metric.compute([], 0, {})).toBe(0)
  })
})

describe('createStatusMetric', () => {
  const items: Item[] = [
    { id: 1, status: 'active' },
    { id: 2, status: 'active' },
    { id: 3, status: 'inactive' },
    { id: 4, status: 'pending' },
  ]

  it('counts items matching a single status', () => {
    const metric = createStatusMetric('active', 'Active', MockIcon)
    expect(metric.compute(items, 4, {})).toBe(2)
  })

  it('counts items matching multiple statuses', () => {
    const metric = createStatusMetric(['active', 'pending'], 'In Progress', MockIcon, { id: 'open' })
    expect(metric.compute(items, 4, {})).toBe(3)
  })

  it('returns 0 when no items match', () => {
    const metric = createStatusMetric('cancelled', 'Cancelled', MockIcon)
    expect(metric.compute(items, 4, {})).toBe(0)
  })

  it('sets serverFilter correctly for single status', () => {
    const metric = createStatusMetric('active', 'Active', MockIcon)
    expect(metric.serverFilter).toEqual({
      column: 'status',
      operator: 'eq',
      value: 'active',
    })
  })

  it('sets serverFilter with "in" operator for multi-status', () => {
    const metric = createStatusMetric(['active', 'pending'], 'Open', MockIcon, { id: 'open' })
    expect(metric.serverFilter).toEqual({
      column: 'status',
      operator: 'in',
      value: ['active', 'pending'],
    })
  })

  it('supports custom column', () => {
    const metric = createStatusMetric('open', 'Open', MockIcon, { column: 'settlement_status' })
    expect(metric.serverFilter?.column).toBe('settlement_status')
  })

  it('sets highlight when option is true', () => {
    const metric = createStatusMetric('pending', 'Pending', MockIcon, { highlight: true })
    expect(typeof metric.highlight).toBe('function')
    expect(metric.highlight!(5, [])).toBe(true)
    expect(metric.highlight!(0, [])).toBe(false)
  })
})

describe('createBooleanMetric', () => {
  const items: Item[] = [
    { id: 1, is_active: true },
    { id: 2, is_active: true },
    { id: 3, is_active: false },
  ]

  it('counts items where boolean is true', () => {
    const metric = createBooleanMetric('is_active', true, 'Active', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(2)
  })

  it('counts items where boolean is false', () => {
    const metric = createBooleanMetric('is_active', false, 'Inactive', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(1)
  })

  it('sets serverFilter correctly', () => {
    const metric = createBooleanMetric('is_active', true, 'Active', MockIcon)
    expect(metric.serverFilter).toEqual({
      column: 'is_active',
      operator: 'eq',
      value: true,
    })
  })

  it('derives id from column for true', () => {
    const metric = createBooleanMetric('is_active', true, 'Active', MockIcon)
    expect(metric.id).toBe('active')
  })

  it('derives id from column for false', () => {
    const metric = createBooleanMetric('is_active', false, 'Inactive', MockIcon)
    expect(metric.id).toBe('not_active')
  })

  it('uses custom id when provided', () => {
    const metric = createBooleanMetric('is_active', true, 'Active', MockIcon, { id: 'custom' })
    expect(metric.id).toBe('custom')
  })
})

describe('createNullCheckMetric', () => {
  const items: Item[] = [
    { id: 1, user_id: 'abc' },
    { id: 2, user_id: null },
    { id: 3, user_id: undefined },
  ]

  it('counts null items', () => {
    const metric = createNullCheckMetric('user_id', true, 'No Login', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(2) // null and undefined
  })

  it('counts non-null items', () => {
    const metric = createNullCheckMetric('user_id', false, 'Has Login', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(1)
  })

  it('sets serverFilter for is_null', () => {
    const metric = createNullCheckMetric('user_id', true, 'No Login', MockIcon)
    expect(metric.serverFilter?.operator).toBe('is_null')
  })

  it('sets serverFilter for is_not_null', () => {
    const metric = createNullCheckMetric('user_id', false, 'Has Login', MockIcon)
    expect(metric.serverFilter?.operator).toBe('is_not_null')
  })

  it('derives id from column and isNull', () => {
    const nullMetric = createNullCheckMetric('user_id', true, 'No Login', MockIcon)
    expect(nullMetric.id).toBe('user_id_null')
    const notNullMetric = createNullCheckMetric('user_id', false, 'Has Login', MockIcon)
    expect(notNullMetric.id).toBe('user_id_not_null')
  })
})

describe('createSumMetric', () => {
  const items: Item[] = [
    { amount: 1000 },
    { amount: 2000 },
    { amount: 500 },
  ]

  it('sums column from items when no serverData', () => {
    const metric = createSumMetric('amount', 'total', 'Total', MockIcon, { format: 'number' })
    const result = metric.compute(items, 3, {})
    expect(result).toBe(3500)
  })

  it('uses serverData when available', () => {
    const metric = createSumMetric('amount', 'total', 'Total', MockIcon, { format: 'number' })
    const result = metric.compute(items, 3, { total: 99999 })
    expect(result).toBe(99999)
  })

  it('formats as currency by default', () => {
    const metric = createSumMetric('amount', 'revenue', 'Revenue', MockIcon)
    const result = metric.compute(items, 3, {})
    expect(String(result)).toContain('3,500')
  })

  it('handles items with missing/NaN values gracefully', () => {
    const sparseItems: Item[] = [
      { amount: 1000 },
      { amount: undefined },
      { amount: 'not-a-number' },
    ]
    const metric = createSumMetric('amount', 'total', 'Total', MockIcon, { format: 'number' })
    expect(metric.compute(sparseItems, 3, {})).toBe(1000)
  })
})

describe('createCountMetric', () => {
  const items: Item[] = [
    { priority: 'urgent', status: 'open' },
    { priority: 'urgent', status: 'closed' },
    { priority: 'normal', status: 'open' },
  ]

  it('counts items matching custom predicate', () => {
    const metric = createCountMetric(
      'urgent_open',
      'Urgent Open',
      MockIcon,
      (item) => item.priority === 'urgent' && item.status === 'open'
    )
    expect(metric.compute(items, 3, {})).toBe(1)
  })

  it('returns 0 when no items match predicate', () => {
    const metric = createCountMetric(
      'none',
      'None',
      MockIcon,
      (item) => item.priority === 'critical'
    )
    expect(metric.compute(items, 3, {})).toBe(0)
  })

  it('sets highlight when option is true', () => {
    const metric = createCountMetric('x', 'X', MockIcon, () => true, { highlight: true })
    expect(typeof metric.highlight).toBe('function')
    expect(metric.highlight!(3, [])).toBe(true)
    expect(metric.highlight!(0, [])).toBe(false)
  })
})

describe('createTodayCountMetric', () => {
  it('counts items from today', () => {
    const todayISO = new Date().toISOString().split('T')[0]
    const items: Item[] = [
      { check_in: `${todayISO}T08:00:00` },
      { check_in: `${todayISO}T10:00:00` },
      { check_in: '2020-01-01T08:00:00' },
    ]
    const metric = createTodayCountMetric('check_in', 'Today', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(2)
  })

  it('returns 0 when no items are from today', () => {
    const items: Item[] = [{ date: '2020-01-01' }, { date: '2019-06-15' }]
    const metric = createTodayCountMetric('date', 'Today', MockIcon)
    expect(metric.compute(items, 2, {})).toBe(0)
  })

  it('uses custom id', () => {
    const metric = createTodayCountMetric('date', 'Today', MockIcon, { id: 'today_signups' })
    expect(metric.id).toBe('today_signups')
  })
})

describe('createThisMonthCountMetric', () => {
  it('counts items from current month', () => {
    const now = new Date()
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString()
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString()
    const items: Item[] = [
      { created_at: thisMonthDate },
      { created_at: thisMonthDate },
      { created_at: lastMonthDate },
    ]
    const metric = createThisMonthCountMetric('created_at', 'This Month', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(2)
  })
})

describe('createAverageMetric', () => {
  it('computes average of a column as a string', () => {
    const items: Item[] = [
      { hours: 8 },
      { hours: 6 },
      { hours: 10 },
    ]
    const metric = createAverageMetric('hours', 'avg_hours', 'Avg Hours', MockIcon)
    const result = metric.compute(items, 3, {})
    expect(result).toBe('8') // returns string
  })

  it('returns em dash for empty items', () => {
    const metric = createAverageMetric('hours', 'avg_hours', 'Avg Hours', MockIcon)
    expect(metric.compute([], 0, {})).toBe('—')
  })

  it('appends suffix when provided', () => {
    const items: Item[] = [{ hours: 9 }]
    const metric = createAverageMetric('hours', 'avg_hours', 'Avg Hours', MockIcon, { suffix: 'h' })
    expect(metric.compute(items, 1, {})).toBe('9h')
  })

  it('with filterNulls skips null/zero values', () => {
    const items: Item[] = [
      { hours: 10 },
      { hours: undefined },
      { hours: null },
      { hours: 6 },
    ]
    const metric = createAverageMetric('hours', 'avg_hours', 'Avg Hours', MockIcon, { filterNulls: true })
    const result = metric.compute(items, 4, {})
    // Only 2 valid items: (10 + 6) / 2 = 8
    expect(result).toBe('8')
  })
})

describe('createExpiringMetric', () => {
  it('counts items expiring within the specified days', () => {
    // Use timestamps directly to avoid midnight UTC ambiguity
    const now = Date.now()
    const in2DaysTs = new Date(now + 2 * 86400000).toISOString()
    const in10DaysTs = new Date(now + 10 * 86400000).toISOString()
    const yesterdayTs = new Date(now - 86400000).toISOString()

    const items: Item[] = [
      { expires_at: in2DaysTs },   // within 3 days → count
      { expires_at: in10DaysTs },  // not within 3 days → skip
      { expires_at: yesterdayTs }, // past → skip
    ]

    const metric = createExpiringMetric('expires_at', 3, 'Expiring Soon', MockIcon)
    expect(metric.compute(items, 3, {})).toBe(1)
  })

  it('excludes items expiring in the past', () => {
    const pastTs = new Date(Date.now() - 86400000).toISOString()
    const items: Item[] = [{ expires_at: pastTs }]
    const metric = createExpiringMetric('expires_at', 7, 'Expiring Soon', MockIcon)
    expect(metric.compute(items, 1, {})).toBe(0)
  })

  it('filters by activeField when provided', () => {
    const in2DaysTs = new Date(Date.now() + 2 * 86400000).toISOString()
    const items: Item[] = [
      { expires_at: in2DaysTs, is_active: true },
      { expires_at: in2DaysTs, is_active: false }, // inactive → skip
    ]
    const metric = createExpiringMetric('expires_at', 7, 'Expiring Soon', MockIcon, { activeField: 'is_active' })
    expect(metric.compute(items, 2, {})).toBe(1)
  })

  it('skips items with null expiry', () => {
    const items: Item[] = [{ expires_at: null }, { expires_at: undefined }]
    const metric = createExpiringMetric('expires_at', 7, 'Expiring Soon', MockIcon)
    expect(metric.compute(items, 2, {})).toBe(0)
  })
})
