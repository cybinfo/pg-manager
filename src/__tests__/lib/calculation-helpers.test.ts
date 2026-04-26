import {
  calculateTotalDues,
  calculateBalanceDue,
  calculateTotalAmount,
  calculateTotalPaid,
  calculateTotalPayments,
  calculatePendingRefunds,
  calculateCompletedRefunds,
  calculateExitSettlement,
  sumBy,
  sumByFn,
  countBy,
  groupBy,
  groupAndCount,
  groupAndSum,
  calculatePercentage,
  calculateDiscount,
  applyDiscount,
  calculateOccupancyRate,
  calculateAvailable,
  calculateCollectionRate,
} from '@/lib/calculation-helpers'

// ============================================================
// Bill Calculations
// ============================================================

describe('calculateTotalDues', () => {
  it('sums balance_due across bills', () => {
    const bills = [{ balance_due: 1000 }, { balance_due: 2000 }, { balance_due: 500 }]
    expect(calculateTotalDues(bills)).toBe(3500)
  })

  it('treats null/undefined balance_due as 0', () => {
    const bills = [{ balance_due: 1000 }, { balance_due: null }, { balance_due: undefined }]
    expect(calculateTotalDues(bills)).toBe(1000)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotalDues([])).toBe(0)
  })

  it('handles null input gracefully', () => {
    expect(calculateTotalDues(null as unknown as [])).toBe(0)
  })
})

describe('calculateBalanceDue', () => {
  it('subtracts paid from total', () => {
    expect(calculateBalanceDue({ total_amount: 5000, paid_amount: 2000 })).toBe(3000)
  })

  it('returns 0 when fully paid', () => {
    expect(calculateBalanceDue({ total_amount: 5000, paid_amount: 5000 })).toBe(0)
  })

  it('returns 0 when overpaid (no negative balance)', () => {
    expect(calculateBalanceDue({ total_amount: 5000, paid_amount: 6000 })).toBe(0)
  })

  it('handles null paid_amount', () => {
    expect(calculateBalanceDue({ total_amount: 5000, paid_amount: null })).toBe(5000)
  })

  it('handles null total_amount', () => {
    expect(calculateBalanceDue({ total_amount: null, paid_amount: 2000 })).toBe(0)
  })
})

describe('calculateTotalAmount', () => {
  it('sums total_amount across bills', () => {
    const bills = [{ total_amount: 3000 }, { total_amount: 2000 }]
    expect(calculateTotalAmount(bills)).toBe(5000)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotalAmount([])).toBe(0)
  })
})

describe('calculateTotalPaid', () => {
  it('sums paid_amount across bills', () => {
    const bills = [{ paid_amount: 1000 }, { paid_amount: 500 }]
    expect(calculateTotalPaid(bills)).toBe(1500)
  })

  it('treats null as 0', () => {
    const bills = [{ paid_amount: 1000 }, { paid_amount: null }]
    expect(calculateTotalPaid(bills)).toBe(1000)
  })
})

describe('calculateTotalPayments', () => {
  it('sums payment amounts', () => {
    const payments = [{ amount: 500 }, { amount: 1000 }, { amount: 200 }]
    expect(calculateTotalPayments(payments)).toBe(1700)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotalPayments([])).toBe(0)
  })
})

// ============================================================
// Refund Calculations
// ============================================================

describe('calculatePendingRefunds', () => {
  const refunds = [
    { amount: 1000, status: 'pending' },
    { amount: 500, status: 'approved' },
    { amount: 800, status: 'completed' },
    { amount: 200, status: 'rejected' },
  ]

  it('sums pending and approved refunds', () => {
    expect(calculatePendingRefunds(refunds)).toBe(1500)
  })

  it('returns 0 for empty array', () => {
    expect(calculatePendingRefunds([])).toBe(0)
  })

  it('excludes completed and rejected refunds', () => {
    expect(calculatePendingRefunds([{ amount: 500, status: 'completed' }])).toBe(0)
  })
})

describe('calculateCompletedRefunds', () => {
  it('sums only completed refunds', () => {
    const refunds = [
      { amount: 1000, status: 'completed' },
      { amount: 500, status: 'pending' },
    ]
    expect(calculateCompletedRefunds(refunds)).toBe(1000)
  })
})

// ============================================================
// Exit Settlement
// ============================================================

describe('calculateExitSettlement', () => {
  it('calculates when tenant owes money (dues > refundable)', () => {
    const result = calculateExitSettlement({
      unpaidBills: [{ balance_due: 8000 }],
      securityDeposit: 5000,
      advanceAmount: 0,
    })
    expect(result.totalDues).toBe(8000)
    expect(result.totalRefundable).toBe(5000)
    expect(result.netSettlement).toBe(3000)
    expect(result.isOwedToTenant).toBe(false)
  })

  it('calculates when tenant gets refund (refundable > dues)', () => {
    const result = calculateExitSettlement({
      unpaidBills: [{ balance_due: 2000 }],
      securityDeposit: 10000,
      advanceAmount: 0,
    })
    expect(result.isOwedToTenant).toBe(true)
    expect(result.netSettlement).toBe(8000)
  })

  it('includes additionalCharges in dues', () => {
    const result = calculateExitSettlement({
      unpaidBills: [{ balance_due: 1000 }],
      securityDeposit: 5000,
      additionalCharges: 500,
    })
    expect(result.totalDues).toBe(1500)
  })

  it('deducts pending refunds from refundable', () => {
    const result = calculateExitSettlement({
      unpaidBills: [],
      securityDeposit: 10000,
      pendingRefunds: [{ amount: 2000, status: 'pending' }],
    })
    expect(result.totalRefundable).toBe(8000)
  })
})

// ============================================================
// Generic Aggregation
// ============================================================

describe('sumBy', () => {
  it('sums by key', () => {
    const items = [{ amount: 100 }, { amount: 200 }, { amount: 50 }]
    expect(sumBy(items, 'amount')).toBe(350)
  })

  it('ignores non-numeric values', () => {
    const items = [{ amount: 100 }, { amount: 'bad' as unknown as number }]
    expect(sumBy(items, 'amount')).toBe(100)
  })

  it('returns 0 for empty array', () => {
    expect(sumBy([], 'amount')).toBe(0)
  })
})

describe('sumByFn', () => {
  it('sums using custom function', () => {
    const items = [{ price: 100, qty: 2 }, { price: 50, qty: 3 }]
    expect(sumByFn(items, (i) => i.price * i.qty)).toBe(350)
  })

  it('returns 0 for empty array', () => {
    expect(sumByFn([], (i: { v: number }) => i.v)).toBe(0)
  })
})

describe('countBy', () => {
  it('counts items matching predicate', () => {
    const items = [{ status: 'active' }, { status: 'active' }, { status: 'inactive' }]
    expect(countBy(items, (i) => i.status === 'active')).toBe(2)
  })

  it('returns 0 when none match', () => {
    const items = [{ status: 'inactive' }]
    expect(countBy(items, (i) => i.status === 'active')).toBe(0)
  })
})

describe('groupBy', () => {
  it('groups items by key', () => {
    const items = [
      { status: 'active', id: 1 },
      { status: 'active', id: 2 },
      { status: 'inactive', id: 3 },
    ]
    const result = groupBy(items, 'status')
    expect(result['active']).toHaveLength(2)
    expect(result['inactive']).toHaveLength(1)
  })

  it('groups null/undefined key as "unknown"', () => {
    const items = [{ status: null as unknown as string, id: 1 }]
    const result = groupBy(items, 'status')
    expect(result['unknown']).toHaveLength(1)
  })
})

describe('groupAndCount', () => {
  it('counts items per group', () => {
    const items = [
      { status: 'active' },
      { status: 'active' },
      { status: 'inactive' },
    ]
    const result = groupAndCount(items, 'status')
    expect(result['active']).toBe(2)
    expect(result['inactive']).toBe(1)
  })
})

describe('groupAndSum', () => {
  it('sums amounts per group', () => {
    const items = [
      { property: 'A', amount: 1000 },
      { property: 'A', amount: 2000 },
      { property: 'B', amount: 500 },
    ]
    const result = groupAndSum(items, 'property', 'amount')
    expect(result['A']).toBe(3000)
    expect(result['B']).toBe(500)
  })
})

// ============================================================
// Percentage Calculations
// ============================================================

describe('calculatePercentage', () => {
  it('returns integer percentage by default', () => {
    expect(calculatePercentage(25, 100)).toBe(25)
  })

  it('rounds to specified decimals', () => {
    expect(calculatePercentage(1, 3, 2)).toBe(33.33)
  })

  it('returns 0 when total is 0', () => {
    expect(calculatePercentage(5, 0)).toBe(0)
  })

  it('can exceed 100%', () => {
    expect(calculatePercentage(150, 100)).toBe(150)
  })
})

describe('calculateDiscount', () => {
  it('calculates 10% of 5000 = 500', () => {
    expect(calculateDiscount(5000, 10)).toBe(500)
  })

  it('returns 0 for 0% discount', () => {
    expect(calculateDiscount(5000, 0)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    expect(calculateDiscount(1000, 33)).toBe(330)
  })
})

describe('applyDiscount', () => {
  it('subtracts discount from amount', () => {
    expect(applyDiscount(5000, 10)).toBe(4500)
  })

  it('returns full amount for 0% discount', () => {
    expect(applyDiscount(5000, 0)).toBe(5000)
  })
})

// ============================================================
// Occupancy & Collection
// ============================================================

describe('calculateOccupancyRate', () => {
  it('returns 80.0 for 8/10', () => {
    expect(calculateOccupancyRate(8, 10)).toBe(80)
  })

  it('returns 0 when total is 0', () => {
    expect(calculateOccupancyRate(0, 0)).toBe(0)
  })

  it('returns 100 when fully occupied', () => {
    expect(calculateOccupancyRate(10, 10)).toBe(100)
  })
})

describe('calculateAvailable', () => {
  it('returns total minus occupied', () => {
    expect(calculateAvailable(10, 7)).toBe(3)
  })

  it('returns 0 when occupied exceeds total', () => {
    expect(calculateAvailable(5, 8)).toBe(0)
  })
})

describe('calculateCollectionRate', () => {
  it('calculates 90% collection rate', () => {
    expect(calculateCollectionRate(45000, 50000)).toBe(90)
  })

  it('returns 0 when expected is 0', () => {
    expect(calculateCollectionRate(0, 0)).toBe(0)
  })
})
