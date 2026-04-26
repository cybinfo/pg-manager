/**
 * Pure helper functions for the payment-reminders cron route.
 *
 * Extracted so they can be unit-tested independently of Supabase.
 */

// ============================================================================
// Types
// ============================================================================

export interface ReminderNotificationSettings {
  email_reminders_enabled: boolean
  reminder_days_before: number
  send_on_due_date: boolean
  send_overdue_alerts: boolean
  overdue_alert_frequency: "daily" | "weekly"
}

// ============================================================================
// calculateDaysUntilDue
// ============================================================================

/**
 * Returns the number of days from `currentDay` (day-of-month) until the next
 * occurrence of `dueDay`. A negative return value means the due date has
 * already passed this month.
 *
 * Examples (28-day Feb):
 *   currentDay=5,  dueDay=10 → 5    (due this month)
 *   currentDay=10, dueDay=10 → 0    (due today)
 *   currentDay=15, dueDay=10 → -5   (overdue this month)
 *   currentDay=25, dueDay=5  → -20  (overdue, next occurrence is in next month but we still report negative)
 *
 * The route uses this function to decide:
 *   daysUntilDue === reminder_days_before  → send advance reminder
 *   daysUntilDue === 0                     → send due-date reminder
 *   daysUntilDue < 0                       → overdue
 */
export function calculateDaysUntilDue(currentDay: number, dueDay: number): number {
  return dueDay - currentDay
}

// ============================================================================
// calculateMonthsActive
// ============================================================================

/**
 * Returns how many months a tenant has been active, clamped to minimum 1.
 * Uses 30-day approximation (same as the route).
 */
export function calculateMonthsActive(checkInDate: string, today: Date): number {
  const checkIn = new Date(checkInDate)
  const msActive = today.getTime() - checkIn.getTime()
  const months = Math.ceil(msActive / (1000 * 60 * 60 * 24 * 30))
  return Math.max(1, months)
}

// ============================================================================
// calculatePendingDues
// ============================================================================

/**
 * Returns the total pending rent dues for a tenant, clamped at 0.
 * Uses the rough months-active * monthly_rent approach.
 */
export function calculatePendingDues(
  checkInDate: string,
  monthlyRent: number,
  totalPaid: number,
  today: Date
): number {
  const months = calculateMonthsActive(checkInDate, today)
  const expected = months * monthlyRent
  return Math.max(0, expected - totalPaid)
}

// ============================================================================
// shouldSendReminder
// ============================================================================

/**
 * Returns true when an advance (or due-date) reminder should be sent.
 */
export function shouldSendReminder(
  daysUntilDue: number,
  settings: Pick<ReminderNotificationSettings, "reminder_days_before" | "send_on_due_date">
): boolean {
  if (daysUntilDue === settings.reminder_days_before) return true
  if (settings.send_on_due_date && daysUntilDue === 0) return true
  return false
}

// ============================================================================
// shouldSendOverdueAlert
// ============================================================================

/**
 * Returns true when an overdue alert should be sent.
 * Weekly alerts only go out on Mondays (getDay() === 1).
 */
export function shouldSendOverdueAlert(
  daysUntilDue: number,
  today: Date,
  settings: Pick<ReminderNotificationSettings, "send_overdue_alerts" | "overdue_alert_frequency">
): boolean {
  if (!settings.send_overdue_alerts) return false
  if (daysUntilDue >= 0) return false // Not overdue

  if (settings.overdue_alert_frequency === "daily") return true
  if (settings.overdue_alert_frequency === "weekly") return today.getDay() === 1 // Monday

  return false
}
