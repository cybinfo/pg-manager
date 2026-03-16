/**
 * Settings Management Types
 *
 * Types for owner settings, configurations, and preferences.
 * Centralized from src/app/(dashboard)/settings/page.tsx
 */

// ============================================================================
// OWNER PROFILE
// ============================================================================

export interface Owner {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
}

// ============================================================================
// CHARGE TYPES & UTILITIES
// ============================================================================

export interface ChargeType {
  id: string
  name: string
  code: string
  category: string
  is_enabled: boolean
  is_refundable: boolean
  apply_late_fee: boolean
  display_order: number
  calculation_config?: {
    rate_per_unit?: number
    default_amount?: number
    split_by?: 'occupants' | 'room'
  } | null
}

export interface UtilityRate {
  id: string
  name: string
  code: string
  billing_type: 'per_unit' | 'flat_rate'
  rate_per_unit: number
  flat_amount: number
  split_by: 'occupants' | 'room'
  unit_label: string
}

export interface ExpenseType {
  id: string
  name: string
  code: string
  description: string | null
  is_enabled: boolean
  display_order: number
}

// ============================================================================
// OWNER CONFIGURATION
// ============================================================================

export interface NotificationSettings {
  email_reminders_enabled: boolean
  reminder_days_before: number
  send_on_due_date: boolean
  send_overdue_alerts: boolean
  overdue_alert_frequency: "daily" | "weekly"
}

export interface OwnerConfig {
  id: string
  default_notice_period: number
  default_rent_due_day: number
  default_grace_period: number
  currency: string
  notification_settings?: NotificationSettings
}

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

export interface RoomTypePricing {
  single: { rent: number; deposit: number }
  double: { rent: number; deposit: number }
  triple: { rent: number; deposit: number }
  dormitory: { rent: number; deposit: number }
}

export interface PropertyTypePricing {
  pg: RoomTypePricing
  hostel: RoomTypePricing
  coliving: RoomTypePricing
}

export interface ConfigurableRoomType {
  code: string
  name: string
  default_rent: number
  default_deposit: number
  is_enabled: boolean
  display_order: number
}

export type PropertyType = 'pg' | 'hostel' | 'coliving'
export type RoomType = 'single' | 'double' | 'triple' | 'dormitory'

// ============================================================================
// BILLING CONFIGURATION
// ============================================================================

export type BillingCycleMode = 'calendar_month' | 'checkin_anniversary'

export interface AutoBillingSettings {
  enabled: boolean
  billing_day: number
  due_day_offset: number
  include_pending_charges: boolean
  /** Per-charge-type inclusion flags (e.g., { rent: true, electricity: true }) */
  included_charge_types?: Record<string, boolean>
  /** Days after due date before a bill is marked overdue */
  grace_period_days: number
  auto_send_notification: boolean
  /** Enable/disable automatic payment reminders before due date */
  auto_reminder_enabled: boolean
  /** Days before due date to send payment reminder */
  reminder_days_before: number
  last_generated_month: string | null
}

// ============================================================================
// FOOD SETTINGS
// ============================================================================

export interface MealSettings {
  enabled: boolean
  default_rate: number
}

export interface FoodSettings {
  enabled: boolean
  meals: {
    breakfast: MealSettings
    lunch: MealSettings
    dinner: MealSettings
    snacks: MealSettings
  }
  billing_frequency: "daily" | "weekly" | "monthly"
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_ROOM_TYPE_PRICING: RoomTypePricing = {
  single: { rent: 8000, deposit: 16000 },
  double: { rent: 6000, deposit: 12000 },
  triple: { rent: 5000, deposit: 10000 },
  dormitory: { rent: 4000, deposit: 8000 },
}

export const DEFAULT_PROPERTY_TYPE_PRICING: PropertyTypePricing = {
  pg: {
    single: { rent: 8000, deposit: 16000 },
    double: { rent: 6000, deposit: 12000 },
    triple: { rent: 5000, deposit: 10000 },
    dormitory: { rent: 4000, deposit: 8000 },
  },
  hostel: {
    single: { rent: 6000, deposit: 12000 },
    double: { rent: 4500, deposit: 9000 },
    triple: { rent: 3500, deposit: 7000 },
    dormitory: { rent: 2500, deposit: 5000 },
  },
  coliving: {
    single: { rent: 12000, deposit: 24000 },
    double: { rent: 9000, deposit: 18000 },
    triple: { rent: 7000, deposit: 14000 },
    dormitory: { rent: 5000, deposit: 10000 },
  },
}

export const DEFAULT_AUTO_BILLING_SETTINGS: AutoBillingSettings = {
  enabled: false,
  billing_day: 1,
  due_day_offset: 10,
  include_pending_charges: true,
  included_charge_types: {},
  grace_period_days: 7,
  auto_send_notification: true,
  auto_reminder_enabled: true,
  reminder_days_before: 5,
  last_generated_month: null,
}

export const DEFAULT_FOOD_SETTINGS: FoodSettings = {
  enabled: false,
  meals: {
    breakfast: { enabled: false, default_rate: 50 },
    lunch: { enabled: false, default_rate: 80 },
    dinner: { enabled: false, default_rate: 80 },
    snacks: { enabled: false, default_rate: 30 },
  },
  billing_frequency: "monthly",
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_reminders_enabled: true,
  reminder_days_before: 3,
  send_on_due_date: true,
  send_overdue_alerts: true,
  overdue_alert_frequency: "daily",
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  pg: "PG (Paying Guest)",
  hostel: "Hostel",
  coliving: "Co-Living Space",
}
