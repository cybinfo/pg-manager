// Centralized business rule constants shared across cron jobs and public pages.
// Collecting these here prevents magic numbers from spreading across multiple files.

// complaint-escalation cron: number of days a complaint must be open before triggering alert
export const ESCALATION_THRESHOLD_DAYS = 3

// library-notifications cron: daily hours balance at or below this value triggers a low-hours warning
export const LOW_HOURS_DAILY_ALLOWANCE_THRESHOLD = 2

// library-notifications cron: send renewal reminder this many days before membership end_date
export const RENEWAL_REMINDER_DAYS = 3

// library-notifications cron: send expiring-soon notification this many days before membership end_date
export const EXPIRING_DAYS_BEFORE = 7

// pg/[slug] public inquiry form: milliseconds in a rate-limit window (5 minutes)
export const RATE_LIMIT_WINDOW = 5 * 60 * 1000

// pg/[slug] public inquiry form: maximum submissions allowed within RATE_LIMIT_WINDOW
export const MAX_SUBMISSIONS = 3
