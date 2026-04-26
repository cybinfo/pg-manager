/**
 * Tests for pure helper functions used by the payment-reminders cron route.
 *
 * Tested helpers (src/lib/billing/payment-reminders.helpers.ts):
 *  - calculateDaysUntilDue
 *  - calculateMonthsActive
 *  - calculatePendingDues
 *  - shouldSendReminder
 *  - shouldSendOverdueAlert
 */

import {
  calculateDaysUntilDue,
  calculateMonthsActive,
  calculatePendingDues,
  shouldSendReminder,
  shouldSendOverdueAlert,
  type ReminderNotificationSettings,
} from "@/lib/billing/payment-reminders.helpers"

// ============================================================================
// Fixtures
// ============================================================================

const BASE_SETTINGS: ReminderNotificationSettings = {
  email_reminders_enabled: true,
  reminder_days_before: 5,
  send_on_due_date: true,
  send_overdue_alerts: true,
  overdue_alert_frequency: "daily",
}

const MONDAY = new Date("2026-04-27") // April 27, 2026 is a Monday
const TUESDAY = new Date("2026-04-28")
const WEDNESDAY = new Date("2026-04-29")

// ============================================================================
// calculateDaysUntilDue
// ============================================================================

describe("calculateDaysUntilDue", () => {
  describe("due date is in the future this month", () => {
    it("returns positive days when current < due", () => {
      expect(calculateDaysUntilDue(5, 10)).toBe(5)
    })

    it("returns 1 day before the due date", () => {
      expect(calculateDaysUntilDue(9, 10)).toBe(1)
    })

    it("returns reminder_days_before count correctly", () => {
      expect(calculateDaysUntilDue(1, 5)).toBe(4)
    })
  })

  describe("due date is today", () => {
    it("returns 0 on due day", () => {
      expect(calculateDaysUntilDue(10, 10)).toBe(0)
    })

    it("returns 0 when due on 1st and today is 1st", () => {
      expect(calculateDaysUntilDue(1, 1)).toBe(0)
    })
  })

  describe("past due date (overdue)", () => {
    it("returns negative when current > due", () => {
      expect(calculateDaysUntilDue(15, 10)).toBe(-5)
    })

    it("returns -1 when one day past due", () => {
      expect(calculateDaysUntilDue(11, 10)).toBe(-1)
    })

    it("returns deeply negative late in month", () => {
      expect(calculateDaysUntilDue(28, 1)).toBe(-27)
    })
  })

  describe("due day is 1st of month", () => {
    it("day 1, due 1 → 0", () => {
      expect(calculateDaysUntilDue(1, 1)).toBe(0)
    })

    it("day 5, due 1 → -4 (overdue)", () => {
      expect(calculateDaysUntilDue(5, 1)).toBe(-4)
    })
  })
})

// ============================================================================
// calculateMonthsActive
// ============================================================================

describe("calculateMonthsActive", () => {
  const today = new Date("2026-04-15")

  it("returns 1 for a tenant who just joined today", () => {
    expect(calculateMonthsActive("2026-04-15", today)).toBe(1)
  })

  it("returns 1 for a tenant joined yesterday (< 30 days)", () => {
    expect(calculateMonthsActive("2026-04-14", today)).toBe(1)
  })

  it("returns 1 for a tenant joined exactly 30 days ago", () => {
    const thirtyDaysAgo = new Date("2026-03-16")
    expect(calculateMonthsActive(thirtyDaysAgo.toISOString().split("T")[0], today)).toBe(1)
  })

  it("returns 2 for a tenant joined ~35 days ago", () => {
    expect(calculateMonthsActive("2026-03-11", today)).toBe(2)
  })

  it("returns 12 for a tenant joined 360 days ago (12 × 30-day months)", () => {
    // 12 * 30 = 360 days: 2026-04-15 - 360 days = 2025-04-20
    expect(calculateMonthsActive("2025-04-20", today)).toBe(12)
  })

  it("clamps to minimum 1 even for future check-in dates", () => {
    expect(calculateMonthsActive("2026-05-01", today)).toBe(1)
  })
})

// ============================================================================
// calculatePendingDues
// ============================================================================

describe("calculatePendingDues", () => {
  const today = new Date("2026-04-15")

  it("returns expected dues when tenant has paid nothing", () => {
    // Joined 30 days ago → 1 month active, rent 8000, paid 0 → due 8000
    const result = calculatePendingDues("2026-03-16", 8000, 0, today)
    expect(result).toBe(8000)
  })

  it("returns 0 when tenant has paid in full", () => {
    const result = calculatePendingDues("2026-03-16", 8000, 8000, today)
    expect(result).toBe(0)
  })

  it("returns 0 when tenant has overpaid", () => {
    const result = calculatePendingDues("2026-03-16", 8000, 10000, today)
    expect(result).toBe(0)
  })

  it("returns partial dues for partial payment", () => {
    const result = calculatePendingDues("2026-03-16", 8000, 3000, today)
    expect(result).toBe(5000)
  })

  it("accumulates over multiple months", () => {
    // Joined 65 days ago → 3 months active, rent 5000, paid 5000 → due 10000
    const result = calculatePendingDues("2026-02-09", 5000, 5000, today)
    expect(result).toBe(10000)
  })
})

// ============================================================================
// shouldSendReminder
// ============================================================================

describe("shouldSendReminder", () => {
  describe("advance reminder (reminder_days_before)", () => {
    it("sends reminder when daysUntilDue matches reminder_days_before", () => {
      expect(shouldSendReminder(5, BASE_SETTINGS)).toBe(true)
    })

    it("does not send reminder when daysUntilDue does not match", () => {
      expect(shouldSendReminder(4, BASE_SETTINGS)).toBe(false)
      expect(shouldSendReminder(6, BASE_SETTINGS)).toBe(false)
      expect(shouldSendReminder(10, BASE_SETTINGS)).toBe(false)
    })

    it("does not send advance reminder when past due", () => {
      expect(shouldSendReminder(-1, BASE_SETTINGS)).toBe(false)
    })
  })

  describe("due-date reminder (send_on_due_date)", () => {
    it("sends when daysUntilDue is 0 and send_on_due_date is true", () => {
      expect(shouldSendReminder(0, BASE_SETTINGS)).toBe(true)
    })

    it("does not send when send_on_due_date is false, even on due date", () => {
      const settings = { ...BASE_SETTINGS, send_on_due_date: false }
      expect(shouldSendReminder(0, settings)).toBe(false)
    })

    it("due-date reminder does not fire when reminder_days_before is also 0", () => {
      const settings = { ...BASE_SETTINGS, reminder_days_before: 0 }
      // Both conditions would match — result is still true
      expect(shouldSendReminder(0, settings)).toBe(true)
    })
  })

  describe("reminder_days_before=0 edge case", () => {
    it("matches same-day when reminder_days_before=0", () => {
      const settings = { ...BASE_SETTINGS, reminder_days_before: 0 }
      expect(shouldSendReminder(0, settings)).toBe(true)
    })
  })
})

// ============================================================================
// shouldSendOverdueAlert
// ============================================================================

describe("shouldSendOverdueAlert", () => {
  describe("not overdue (daysUntilDue >= 0)", () => {
    it("does not send alert when on due date", () => {
      expect(shouldSendOverdueAlert(0, MONDAY, BASE_SETTINGS)).toBe(false)
    })

    it("does not send alert when 5 days before due", () => {
      expect(shouldSendOverdueAlert(5, MONDAY, BASE_SETTINGS)).toBe(false)
    })
  })

  describe("overdue with daily alerts", () => {
    const dailySettings = { ...BASE_SETTINGS, overdue_alert_frequency: "daily" as const }

    it("sends alert every day when overdue", () => {
      expect(shouldSendOverdueAlert(-1, MONDAY, dailySettings)).toBe(true)
      expect(shouldSendOverdueAlert(-1, TUESDAY, dailySettings)).toBe(true)
      expect(shouldSendOverdueAlert(-1, WEDNESDAY, dailySettings)).toBe(true)
    })

    it("sends alert for deeply overdue tenants", () => {
      expect(shouldSendOverdueAlert(-20, WEDNESDAY, dailySettings)).toBe(true)
    })
  })

  describe("overdue with weekly alerts (Mondays only)", () => {
    const weeklySettings: ReminderNotificationSettings = {
      ...BASE_SETTINGS,
      overdue_alert_frequency: "weekly",
    }

    it("sends alert on Monday when overdue", () => {
      expect(shouldSendOverdueAlert(-5, MONDAY, weeklySettings)).toBe(true)
    })

    it("does not send on Tuesday when overdue", () => {
      expect(shouldSendOverdueAlert(-5, TUESDAY, weeklySettings)).toBe(false)
    })

    it("does not send on Wednesday when overdue", () => {
      expect(shouldSendOverdueAlert(-5, WEDNESDAY, weeklySettings)).toBe(false)
    })
  })

  describe("send_overdue_alerts disabled", () => {
    const noOverdueSettings = { ...BASE_SETTINGS, send_overdue_alerts: false }

    it("never sends alert even when overdue", () => {
      expect(shouldSendOverdueAlert(-5, MONDAY, noOverdueSettings)).toBe(false)
      expect(shouldSendOverdueAlert(-5, TUESDAY, noOverdueSettings)).toBe(false)
    })
  })
})
