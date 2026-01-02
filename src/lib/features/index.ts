/**
 * Feature Flags System
 *
 * Allows controlling feature availability at the workspace/owner level.
 * Features can be enabled/disabled without code deployment.
 */

// All available feature flags with their default states
export const FEATURE_FLAGS = {
  // Core Features
  approvals: {
    key: "approvals",
    name: "Approvals Hub",
    description: "Enable tenant request workflow for name/address changes",
    defaultEnabled: true,
    category: "core",
  },
  architectureView: {
    key: "architectureView",
    name: "Architecture View",
    description: "2D visual map of properties, rooms, and beds",
    defaultEnabled: true,
    category: "core",
  },
  food: {
    key: "food",
    name: "Food & Meals",
    description: "Track tenant meal options (breakfast, lunch, dinner)",
    defaultEnabled: false,
    category: "optional",
  },
  whatsappSummaries: {
    key: "whatsappSummaries",
    name: "WhatsApp Summaries",
    description: "Daily payment/expense summaries via WhatsApp",
    defaultEnabled: false,
    category: "optional",
  },
  meterReadings: {
    key: "meterReadings",
    name: "Meter Readings",
    description: "Track electricity, water, and gas meters",
    defaultEnabled: true,
    category: "core",
  },
  publicWebsite: {
    key: "publicWebsite",
    name: "Public PG Website",
    description: "Public facing website for your PG at managekar.com/pg/slug",
    defaultEnabled: true,
    category: "core",
  },
  exitClearance: {
    key: "exitClearance",
    name: "Exit Clearance",
    description: "Structured checkout process for tenants",
    defaultEnabled: true,
    category: "core",
  },
  visitors: {
    key: "visitors",
    name: "Visitor Log",
    description: "Track visitors to your properties",
    defaultEnabled: true,
    category: "core",
  },
  notices: {
    key: "notices",
    name: "Notices & Announcements",
    description: "Send announcements to tenants",
    defaultEnabled: true,
    category: "core",
  },
  complaints: {
    key: "complaints",
    name: "Complaints System",
    description: "Tenant complaint and issue tracking",
    defaultEnabled: true,
    category: "core",
  },
  expenses: {
    key: "expenses",
    name: "Expense Tracking",
    description: "Track property-related expenses",
    defaultEnabled: true,
    category: "core",
  },
  reports: {
    key: "reports",
    name: "Reports & Analytics",
    description: "Revenue, occupancy, and financial reports",
    defaultEnabled: true,
    category: "core",
  },
  autoBilling: {
    key: "autoBilling",
    name: "Auto Billing",
    description: "Automatic monthly bill generation",
    defaultEnabled: true,
    category: "billing",
  },
  emailReminders: {
    key: "emailReminders",
    name: "Email Reminders",
    description: "Automated payment reminder emails",
    defaultEnabled: true,
    category: "notifications",
  },
  demoMode: {
    key: "demoMode",
    name: "Demo Mode",
    description: "Mask sensitive data for demonstrations",
    defaultEnabled: false,
    category: "special",
  },
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS

// Feature flags interface for storage
export interface FeatureFlags {
  [key: string]: boolean
}

// Get default feature flags configuration
export function getDefaultFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {}
  for (const [key, config] of Object.entries(FEATURE_FLAGS)) {
    flags[key] = config.defaultEnabled
  }
  return flags
}

// Check if a feature is enabled
export function isFeatureEnabled(
  flags: FeatureFlags | undefined,
  feature: FeatureFlagKey
): boolean {
  if (!flags) {
    return FEATURE_FLAGS[feature]?.defaultEnabled ?? false
  }
  return flags[feature] ?? FEATURE_FLAGS[feature]?.defaultEnabled ?? false
}

// Get all features by category
export function getFeaturesByCategory() {
  const categories: Record<string, typeof FEATURE_FLAGS[FeatureFlagKey][]> = {}

  for (const config of Object.values(FEATURE_FLAGS)) {
    if (!categories[config.category]) {
      categories[config.category] = []
    }
    categories[config.category].push(config)
  }

  return categories
}

// Category labels for UI
export const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Features",
  optional: "Optional Features",
  billing: "Billing & Payments",
  notifications: "Notifications",
  special: "Special Features",
}
