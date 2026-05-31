/**
 * Permission Groups Configuration
 *
 * Centralized definition of permission groups for staff role management.
 * Used by both the "New Role" and "Edit Role" pages.
 */

export interface PermissionItem {
  key: string
  label: string
}

export interface PermissionGroup {
  label: string
  permissions: PermissionItem[]
}

export const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  properties: {
    label: "Properties",
    permissions: [
      { key: "properties.view", label: "View properties" },
      { key: "properties.create", label: "Create properties" },
      { key: "properties.edit", label: "Edit properties" },
      { key: "properties.delete", label: "Delete properties" },
    ],
  },
  rooms: {
    label: "Rooms",
    permissions: [
      { key: "rooms.view", label: "View rooms" },
      { key: "rooms.create", label: "Create rooms" },
      { key: "rooms.edit", label: "Edit rooms" },
      { key: "rooms.delete", label: "Delete rooms" },
    ],
  },
  tenants: {
    label: "Tenants",
    permissions: [
      { key: "tenants.view", label: "View tenants" },
      { key: "tenants.create", label: "Add tenants" },
      { key: "tenants.edit", label: "Edit tenants" },
      { key: "tenants.delete", label: "Remove tenants" },
    ],
  },
  payments: {
    label: "Payments",
    permissions: [
      { key: "payments.view", label: "View payments" },
      { key: "payments.create", label: "Record payments" },
      { key: "payments.edit", label: "Edit payments" },
      { key: "payments.delete", label: "Delete payments" },
    ],
  },
  meter_readings: {
    label: "Meter Readings",
    permissions: [
      { key: "meter_readings.view", label: "View readings" },
      { key: "meter_readings.create", label: "Record readings" },
      { key: "meter_readings.edit", label: "Edit readings" },
    ],
  },
  complaints: {
    label: "Complaints",
    permissions: [
      { key: "complaints.view", label: "View complaints" },
      { key: "complaints.create", label: "Submit complaints" },
      { key: "complaints.edit", label: "Edit complaints" },
      { key: "complaints.resolve", label: "Resolve complaints" },
    ],
  },
  notices: {
    label: "Announcements",
    permissions: [
      { key: "notices.view", label: "View announcements" },
      { key: "notices.create", label: "Create announcements" },
      { key: "notices.edit", label: "Edit announcements" },
      { key: "notices.delete", label: "Delete announcements" },
    ],
  },
  visitors: {
    label: "Visitors",
    permissions: [
      { key: "visitors.view", label: "View visitors" },
      { key: "visitors.create", label: "Check-in visitors" },
    ],
  },
  reports: {
    label: "Reports",
    permissions: [
      { key: "reports.view", label: "View reports" },
      { key: "reports.export", label: "Export reports" },
    ],
  },
  exit_clearance: {
    label: "Exit Clearance",
    permissions: [
      { key: "exit_clearance.initiate", label: "Initiate clearance" },
      { key: "exit_clearance.process", label: "Process clearance" },
      { key: "exit_clearance.approve", label: "Approve clearance" },
    ],
  },
  staff: {
    label: "Staff Management",
    permissions: [
      { key: "staff.view", label: "View staff" },
      { key: "staff.create", label: "Add staff" },
      { key: "staff.edit", label: "Edit staff" },
      { key: "staff.delete", label: "Remove staff" },
    ],
  },
  settings: {
    label: "Settings",
    permissions: [
      { key: "settings.view", label: "View settings" },
      { key: "settings.edit", label: "Edit settings" },
    ],
  },
  businesses: {
    label: "Businesses",
    permissions: [
      { key: "businesses.view", label: "View businesses" },
      { key: "businesses.create", label: "Create businesses" },
      { key: "businesses.edit", label: "Edit businesses" },
      { key: "businesses.delete", label: "Delete businesses" },
    ],
  },
  locations: {
    label: "Locations",
    permissions: [
      { key: "locations.view", label: "View locations" },
      { key: "locations.create", label: "Create locations" },
      { key: "locations.edit", label: "Edit locations" },
      { key: "locations.delete", label: "Delete locations" },
    ],
  },
}
