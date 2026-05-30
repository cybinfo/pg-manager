/**
 * Complaint Status Configurations
 */

import type { StatusConfig } from "./shared"

export const COMPLAINT_STATUS: Record<string, StatusConfig> = {
  open: { label: "Open", variant: "error" },
  acknowledged: { label: "Acknowledged", variant: "warning" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
}

export const COMPLAINT_PRIORITY: Record<string, StatusConfig> = {
  low: { label: "Low", variant: "muted" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "error" },
}

export const COMPLAINT_CATEGORIES: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  furniture: "Furniture",
  cleanliness: "Cleanliness",
  appliances: "Appliances",
  security: "Security",
  noise: "Noise/Disturbance",
  other: "Other",
}

export const COMPLAINT_CATEGORY_OPTIONS = Object.entries(COMPLAINT_CATEGORIES).map(([value, label]) => ({ value, label }))
