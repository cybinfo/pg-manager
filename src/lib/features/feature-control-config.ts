/**
 * Feature Control Center — Three-Tier Configuration
 *
 * Defines the hierarchy used by the Feature Control Center UI:
 *   Domain Module  →  Core Module  →  Feature
 *
 * This config is UI-only. The actual feature flag keys in FEATURE_FLAGS
 * remain the source of truth for gate checks throughout the app.
 *
 * A4 Principle: Every workspace has a self-service Feature Control Center
 * showing all Domain Modules, Core Modules, and Features — with usage
 * meters and dependency enforcement.
 */

import type { FeatureFlagKey } from "./index"

// ============================================================
// Types
// ============================================================

export type DomainId = "pg" | "library" | "platform"

export interface FeatureItem {
  key: FeatureFlagKey
  name: string
  description: string
  /** Features this one depends on (all must be enabled) */
  dependsOn?: FeatureFlagKey[]
}

export interface CoreModule {
  id: string
  name: string
  description: string
  /** Features that belong to this module */
  features: FeatureItem[]
  /** When all features in this module are off, show this note */
  disabledNote?: string
}

export interface DomainModule {
  id: DomainId
  name: string
  description: string
  tagline: string
  modules: CoreModule[]
}

// ============================================================
// PG Manager Domain
// ============================================================

const PG_DOMAIN: DomainModule = {
  id: "pg",
  name: "PG Manager",
  description: "Full suite for managing paying guest accommodations and hostels",
  tagline: "Properties · Rooms · Tenants · Billing",
  modules: [
    {
      id: "pg_operations",
      name: "Operations",
      description: "Day-to-day property operations and tenant management tools",
      features: [
        {
          key: "approvals",
          name: "Approvals Hub",
          description: "Tenant self-service requests — name/address changes, renewals",
        },
        {
          key: "exitClearance",
          name: "Exit Clearance",
          description: "Structured checkout checklist with dues settlement",
        },
        {
          key: "architectureView",
          name: "Architecture View",
          description: "Interactive 2D floor-plan showing rooms, beds, and occupancy",
        },
        {
          key: "food",
          name: "Food & Meals",
          description: "Track breakfast, lunch, and dinner options with per-meal pricing",
        },
        {
          key: "visitors",
          name: "Visitor Log",
          description: "Log and track visitors across all properties",
        },
      ],
      disabledNote: "Disabling all operations features keeps basic room + tenant management active.",
    },
    {
      id: "pg_billing",
      name: "Billing & Finance",
      description: "Automated billing, expense tracking, and financial oversight",
      features: [
        {
          key: "autoBilling",
          name: "Auto Billing",
          description: "Generate monthly bills automatically on your billing cycle",
        },
        {
          key: "expenses",
          name: "Expense Tracking",
          description: "Log and categorise property expenses for P&L clarity",
        },
      ],
    },
    {
      id: "pg_utilities",
      name: "Utilities",
      description: "Meter tracking and utility consumption monitoring",
      features: [
        {
          key: "meterReadings",
          name: "Meter Readings",
          description: "Track electricity, water, and gas consumption per room",
        },
      ],
    },
    {
      id: "pg_communications",
      name: "Communications",
      description: "Tenant-facing communications, issue tracking, and notifications",
      features: [
        {
          key: "notices",
          name: "Notices & Announcements",
          description: "Broadcast notices to tenants — maintenance, events, policy updates",
        },
        {
          key: "complaints",
          name: "Complaints System",
          description: "Structured complaint tracking with status and resolution flow",
        },
        {
          key: "emailReminders",
          name: "Email Reminders",
          description: "Automated payment due-date and overdue reminder emails",
        },
        {
          key: "whatsappSummaries",
          name: "WhatsApp Summaries",
          description: "Daily collection and expense summaries via WhatsApp",
        },
      ],
    },
    {
      id: "pg_marketing",
      name: "Marketing",
      description: "Public presence and lead generation for your properties",
      features: [
        {
          key: "publicWebsite",
          name: "Public PG Website",
          description: "Auto-generated public listing at managekar.com/pg/your-slug",
        },
      ],
    },
  ],
}

// ============================================================
// Library Manager Domain
// ============================================================

const LIBRARY_DOMAIN: DomainModule = {
  id: "library",
  name: "Library Manager",
  description: "Complete management for study libraries — seats, hours, attendance, and lockers",
  tagline: "Members · Seats · Attendance · Lockers",
  modules: [
    {
      id: "library_core",
      name: "Library Module",
      description: "The full Library Manager suite — members, seats, subscriptions, and attendance",
      features: [
        {
          key: "library",
          name: "Library Management",
          description:
            "Enable the entire Library Manager domain — members, seats, sections, attendance, lockers, subscriptions, and payments",
        },
      ],
      disabledNote:
        "Disabling Library Management hides the entire Library module from navigation. All data is preserved.",
    },
  ],
}

// ============================================================
// Platform Tools
// ============================================================

const PLATFORM_DOMAIN: DomainModule = {
  id: "platform",
  name: "Platform Tools",
  description: "Cross-domain intelligence, audit, and workspace configuration",
  tagline: "Analytics · Audit · Debug",
  modules: [
    {
      id: "platform_analytics",
      name: "Analytics & Reports",
      description: "Revenue, occupancy, collection, and trend reports across all properties",
      features: [
        {
          key: "reports",
          name: "Reports & Analytics",
          description: "Full analytics suite — revenue trends, occupancy rates, collection efficiency",
        },
      ],
    },
    {
      id: "platform_tools",
      name: "Platform Tools",
      description: "Audit trail, demo mode, and workspace utilities",
      features: [
        {
          key: "activityLog",
          name: "Activity Log",
          description: "Complete audit trail — every create, update, and delete action logged",
        },
        {
          key: "demoMode",
          name: "Demo Mode",
          description: "Mask sensitive data (names, phones, amounts) for safe demonstrations",
        },
      ],
    },
  ],
}

// ============================================================
// All Domains — order defines tab display order
// ============================================================

export const DOMAIN_MODULES: DomainModule[] = [PG_DOMAIN, LIBRARY_DOMAIN, PLATFORM_DOMAIN]

// ============================================================
// Helper utilities
// ============================================================

/** Get all feature keys that belong to a given core module */
export function getModuleFeatureKeys(module: CoreModule): FeatureFlagKey[] {
  return module.features.map((f) => f.key)
}

/** Check if all features in a module are enabled */
export function isModuleFullyEnabled(
  module: CoreModule,
  flags: Record<string, boolean>
): boolean {
  return module.features.every((f) => flags[f.key] !== false)
}

/** Check if any feature in a module is enabled */
export function isModulePartiallyEnabled(
  module: CoreModule,
  flags: Record<string, boolean>
): boolean {
  return module.features.some((f) => flags[f.key] !== false)
}

/** Get features that would be broken if a given feature is disabled (dependents) */
export function getDependentFeatures(
  disabledKey: FeatureFlagKey,
  domain: DomainModule
): FeatureItem[] {
  const dependents: FeatureItem[] = []
  for (const mod of domain.modules) {
    for (const feature of mod.features) {
      if (feature.dependsOn?.includes(disabledKey)) {
        dependents.push(feature)
      }
    }
  }
  return dependents
}

/** Get the count of enabled features across all domains */
export function countEnabledFeatures(flags: Record<string, boolean>): {
  enabled: number
  total: number
} {
  let enabled = 0
  let total = 0
  for (const domain of DOMAIN_MODULES) {
    for (const mod of domain.modules) {
      for (const feature of mod.features) {
        total++
        if (flags[feature.key] !== false) enabled++
      }
    }
  }
  return { enabled, total }
}
