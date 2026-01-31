/**
 * Types Index
 *
 * Centralized export for all application types.
 * Import from "@/types" for convenience.
 *
 * @example
 * import {
 *   PartialProperty,
 *   PartialTenant,
 *   TenantPortalInfo,
 *   VisitorType,
 * } from "@/types"
 */

// Common types
export * from "./common"

// Entity-specific types
export * from "./tenants.types"
export * from "./visitors.types"
export * from "./journey.types"
export * from "./audit.types"

// Settings types (excluding ExpenseType to avoid conflict with expenses.types)
export type {
  ChargeType,
  NotificationSettings,
  Owner,
  OwnerConfig,
  UtilityRate,
  RoomTypePricing,
  PropertyTypePricing,
  ConfigurableRoomType,
  PropertyType,
  BillingCycleMode,
  AutoBillingSettings,
  MealSettings,
  FoodSettings,
} from "./settings.types"

// Settings constants
export {
  DEFAULT_ROOM_TYPE_PRICING,
  DEFAULT_PROPERTY_TYPE_PRICING,
  DEFAULT_AUTO_BILLING_SETTINGS,
  DEFAULT_FOOD_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  PROPERTY_TYPE_LABELS,
} from "./settings.types"

// RoomType is exported from settings.types as a type alias
export type { RoomType } from "./settings.types"

// Expense types (includes ExpenseType from expenses.types.ts)
export * from "./expenses.types"
export * from "./expense-enhanced.types"

// Table Features types
export * from "./table-features.types"
