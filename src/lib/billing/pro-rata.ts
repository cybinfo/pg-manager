/**
 * billingMonth format: "YYYY-MM"
 * Returns the pro-rated rent for remaining days in that month from joinDate (inclusive).
 */
export function calculateProRataAmount(monthlyRent: number, joinDate: Date, billingMonth: string): number {
  const [year, month] = billingMonth.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const joinDay = joinDate.getDate()
  const remainingDays = daysInMonth - joinDay + 1
  return Math.round((monthlyRent / daysInMonth) * remainingDays)
}

/**
 * Returns the number of days and total days in month for display.
 */
export function getProRataBreakdown(joinDate: Date, billingMonth: string): {
  remainingDays: number
  daysInMonth: number
} {
  const [year, month] = billingMonth.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const joinDay = joinDate.getDate()
  const remainingDays = daysInMonth - joinDay + 1
  return { remainingDays, daysInMonth }
}
