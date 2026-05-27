import type { ModuleCatalog, ModuleDefinition } from './types'

export const MODULES_CATALOG: ModuleCatalog = [
  {
    key: 'properties',
    name: 'Properties',
    description: 'Manage buildings, floors, and property details across all your locations.',
    features: [
      { key: 'architectureView', name: 'Architecture View', description: '2D visual map of your property layout, rooms, and beds.', wired: true },
      { key: 'publicWebsite', name: 'Public Website', description: 'Public-facing website for your property at managekar.com/pg/slug.', wired: true },
      { key: 'maintenanceMode', name: 'Maintenance Mode', description: 'Mark properties or rooms as under maintenance to block new bookings.', wired: true },
    ],
  },
  {
    key: 'rooms',
    name: 'Rooms',
    description: 'Manage rooms, beds, occupancy, and room configurations.',
    features: [
      { key: 'bedCapacityTracking', name: 'Bed Capacity Tracking', description: 'Track individual beds within shared rooms.', wired: true },
      { key: 'roomTypeClassification', name: 'Room Type Classification', description: 'Classify rooms as single, double, triple, dormitory, etc.', wired: true },
      { key: 'amenityTracking', name: 'Amenity Tracking', description: 'Track room-level amenities (AC, TV, attached bath, etc.).', wired: true },
    ],
  },
  {
    key: 'tenants',
    name: 'Tenants',
    description: 'Manage tenant lifecycle from onboarding to exit.',
    features: [
      { key: 'tenantPortal', name: 'Tenant Self-Service Portal', description: 'Tenants can view bills, make payments, and raise complaints via their own portal.', wired: true },
      { key: 'welcomeEmail', name: 'Welcome Email', description: 'Send automated welcome email when a tenant is onboarded.', wired: true },
      { key: 'policeVerification', name: 'Police Verification Tracking', description: 'Track police verification status for each tenant.', wired: true },
      { key: 'documentsUpload', name: 'Document Management', description: 'Collect and store ID proofs and other tenant documents.', wired: true },
    ],
  },
  {
    key: 'members',
    name: 'Members',
    description: 'Manage library memberships, subscriptions, and member lifecycle.',
    features: [
      { key: 'memberPortal', name: 'Member Self-Service Portal', description: 'Members can view attendance, hours balance, and payments via their own portal.', wired: true },
      { key: 'welcomeEmail', name: 'Welcome Email', description: 'Send automated welcome email when a member is added.', wired: true },
      { key: 'hoursTracking', name: 'Daily Hours Tracking', description: 'Track daily hours balance (per-day allowance model).', wired: true },
      { key: 'memberQrCode', name: 'Member QR Code', description: 'Generate QR code per member for quick check-in.', wired: true },
    ],
  },
  {
    key: 'people',
    name: 'People',
    description: 'Central directory for all individuals across your business. Single source of truth for contact data.',
    features: [
      { key: 'mergeDetection', name: 'Duplicate Detection', description: 'Automatically detect and flag duplicate people records by phone or email.', wired: true },
      { key: 'emergencyContacts', name: 'Emergency Contacts', description: 'Store and display emergency contact details per person.', wired: true },
      { key: 'tagging', name: 'People Tagging', description: 'Add custom tags to people for grouping and filtering.', wired: true },
    ],
  },
  {
    key: 'billing',
    name: 'Billing',
    description: 'Generate and manage bills, rent invoices, and utility charges.',
    features: [
      { key: 'autoBilling', name: 'Auto Billing', description: 'Automatically generate monthly rent bills on a scheduled day.', wired: true },
      { key: 'proRataBilling', name: 'Pro-Rata Billing', description: 'Calculate partial-month bills for mid-cycle joins or exits.', wired: true },
      { key: 'gstInvoicing', name: 'GST Invoicing', description: 'Include GST breakdown on invoices (CGST + SGST).', wired: true },
      { key: 'lateFeePenalty', name: 'Late Fee / Penalty', description: 'Automatically add late payment fees after the due date.', wired: true },
    ],
  },
  {
    key: 'payments',
    name: 'Payments',
    description: 'Record and track incoming payments from tenants and members.',
    features: [
      { key: 'paymentReceipts', name: 'Payment Receipts', description: 'Generate and email payment receipts automatically on recording.', wired: true },
      { key: 'paymentReminders', name: 'Payment Reminders', description: 'Send automated reminders before and after due dates.', wired: true },
      { key: 'bulkPaymentRecording', name: 'Bulk Payment Recording', description: 'Record multiple payments in one go.', wired: true },
      { key: 'reconciliation', name: 'Payment Reconciliation', description: '2-panel UI to match unlinked payments to outstanding bills.', wired: true },
    ],
  },
  {
    key: 'refunds',
    name: 'Refunds',
    description: 'Manage tenant and member refund requests and processing.',
    features: [
      { key: 'refundApproval', name: 'Refund Approval Workflow', description: 'Require owner approval before processing refunds.', wired: true },
      { key: 'autoRefundCalculation', name: 'Auto Refund Calculation', description: 'Automatically calculate deposit refund amount on exit.', wired: true },
    ],
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    description: 'Manage recurring library memberships with plan, duration, and payment tracking.',
    features: [
      { key: 'renewalReminders', name: 'Renewal Reminders', description: 'Send email reminders when membership is expiring soon.', wired: true },
      { key: 'partialPayment', name: 'Partial Payment Support', description: 'Allow recording partial payments against a subscription.', wired: true },
      { key: 'subscriptionHistory', name: 'Subscription History', description: 'View full history of all subscriptions per member.', wired: true },
    ],
  },
  {
    key: 'plans',
    name: 'Plans',
    description: 'Define subscription plans with hours, duration, and pricing.',
    features: [
      { key: 'planExpiry', name: 'Plan Expiry Management', description: 'Automatically expire plans when duration ends.', wired: true },
      { key: 'planUsageTracking', name: 'Plan Usage Tracking', description: 'Show how many members are on each plan.', wired: true },
    ],
  },
  {
    key: 'expenses',
    name: 'Expenses',
    description: 'Track all property-related expenses: daily spend, vendor bills, services.',
    features: [
      { key: 'vendorManagement', name: 'Vendor Management', description: 'Maintain a directory of vendors and shop records.', wired: true },
      { key: 'serviceTracking', name: 'Service & Provider Tracking', description: 'Track recurring service providers and their invoices.', wired: true },
      { key: 'billPayments', name: 'Bill Payments', description: 'Record utility bill payments (electricity, water, etc.).', wired: true },
      { key: 'dailySpend', name: 'Daily Spend Log', description: 'Quick entry for day-to-day small expenses.', wired: true },
      { key: 'miscTransactions', name: 'Misc Transactions', description: 'Miscellaneous credit/debit transactions outside standard categories.', wired: true },
    ],
  },
  {
    key: 'meters',
    name: 'Meters',
    description: 'Track physical utility meters and monthly consumption readings.',
    features: [
      { key: 'meterReadings', name: 'Meter Readings', description: 'Record monthly meter readings and compute consumption per room.', wired: true },
      { key: 'consumptionAlerts', name: 'Consumption Alerts', description: 'Alert when consumption is unusually high or low.', wired: true },
      { key: 'perRoomMetering', name: 'Per-Room Metering', description: 'Assign individual meters to rooms for per-room billing.', wired: true },
    ],
  },
  {
    key: 'attendance',
    name: 'Attendance',
    description: 'Track member check-in and check-out times in the library.',
    features: [
      { key: 'qrCheckin', name: 'QR Code Check-In', description: 'Members scan their QR code at the gate to check in/out.', wired: true },
      { key: 'autoHoursDeduction', name: 'Auto Hours Deduction', description: 'Automatically deduct hours from daily balance on check-out.', wired: true },
      { key: 'csvExport', name: 'Attendance CSV Export', description: 'Export attendance records as CSV for reporting.', wired: true },
      { key: 'lateEntry', name: 'Late Entry Tracking', description: 'Flag check-ins that occur outside the assigned time slot.', wired: true },
    ],
  },
  {
    key: 'seats',
    name: 'Seats',
    description: 'Manage individual study seats within library sections.',
    features: [
      { key: 'seatAssignment', name: 'Seat Assignment', description: 'Assign specific seats to members for dedicated seating.', wired: true },
      { key: 'seatReservation', name: 'Seat Reservation', description: 'Allow members to reserve seats in advance.', wired: true },
    ],
  },
  {
    key: 'sections',
    name: 'Sections',
    description: 'Manage study areas or halls within the library (AC, Non-AC, etc.).',
    features: [
      { key: 'sectionCapacity', name: 'Section Capacity Tracking', description: 'Track occupied vs. available seats per section.', wired: true },
      { key: 'acNonAcTracking', name: 'AC / Non-AC Classification', description: 'Classify sections by comfort level for differential pricing.', wired: true },
    ],
  },
  {
    key: 'lockers',
    name: 'Lockers',
    description: 'Manage locker assignments and rentals for library members.',
    features: [
      { key: 'lockerRenewal', name: 'Locker Renewal Reminders', description: 'Notify members when their locker rental is about to expire.', wired: true },
      { key: 'lockerHistory', name: 'Assignment History', description: 'Full history of who used each locker.', wired: true },
    ],
  },
  {
    key: 'waitlist',
    name: 'Waitlist',
    description: 'Manage prospective members waiting for a seat or membership.',
    features: [
      { key: 'autoQueueing', name: 'Auto Queue Positioning', description: 'Automatically assign queue numbers to new waitlist entries.', wired: true },
      { key: 'waitlistNotifications', name: 'Waitlist Notifications', description: 'Notify prospective members when a seat opens up.', wired: true },
    ],
  },
  {
    key: 'complaints',
    name: 'Complaints',
    description: 'Receive and resolve complaints from tenants and members.',
    features: [
      { key: 'complaintResolution', name: 'Resolution Tracking', description: 'Track resolution notes and status transitions per complaint.', wired: true },
      { key: 'complaintEscalation', name: 'Escalation Alerts', description: 'Alert owner when a complaint has been open beyond a threshold.', wired: true },
      { key: 'resolutionEmail', name: 'Resolution Email', description: 'Send email to tenant/member when complaint is resolved.', wired: true },
    ],
  },
  {
    key: 'notices',
    name: 'Notices',
    description: 'Send announcements and notices to tenants, members, or all.',
    features: [
      { key: 'broadcastNotices', name: 'Broadcast Notices', description: 'Send a notice to all tenants or all members at once.', wired: true },
      { key: 'targetedNotices', name: 'Targeted Notices', description: 'Send notices to specific people or groups.', wired: true },
      { key: 'noticeScheduling', name: 'Schedule Notices', description: 'Schedule a notice to go out at a future date and time.', wired: true },
    ],
  },
  {
    key: 'visitors',
    name: 'Visitors',
    description: 'Log and track visitors entering the premises.',
    features: [
      { key: 'visitorLog', name: 'Visitor Log', description: 'Record visitor name, purpose, and check-in/out time.', wired: true },
      { key: 'gatePassGeneration', name: 'Gate Pass', description: 'Generate a printable gate pass for each visitor.', wired: true },
    ],
  },
  {
    key: 'staff',
    name: 'Staff',
    description: 'Manage staff members, roles, and permissions.',
    features: [
      { key: 'staffRoles', name: 'Custom Roles', description: 'Define custom roles with specific permission sets.', wired: true },
      { key: 'staffInvitations', name: 'Staff Invitations', description: 'Invite staff via email link — no manual account creation.', wired: true },
      { key: 'permissionDeny', name: 'Permission Deny Override', description: 'Explicitly deny specific permissions for individual staff.', wired: true },
    ],
  },
  {
    key: 'reports',
    name: 'Reports',
    description: 'Revenue, occupancy, and operational analytics across your business.',
    features: [
      { key: 'revenueReports', name: 'Revenue Reports', description: 'Monthly and annual revenue breakdown by property or library.', wired: true },
      { key: 'occupancyReports', name: 'Occupancy Reports', description: 'Track bed/seat occupancy rates over time.', wired: true },
      { key: 'csvExport', name: 'CSV Export', description: 'Export any report to CSV for external analysis.', wired: true },
      { key: 'paymentAnalytics', name: 'Payment Analytics', description: 'Trend charts for payment volumes by day, week, or month.', wired: true },
    ],
  },
  {
    key: 'approvals',
    name: 'Approvals',
    description: 'Workflow for tenant and member self-service requests requiring owner sign-off.',
    features: [
      { key: 'tenantRequests', name: 'Tenant Requests', description: 'Tenants can submit requests for name/address changes or lease renewal.', wired: true },
      { key: 'autoApproval', name: 'Auto-Approval Rules', description: 'Define rules to automatically approve low-risk requests.', wired: true },
    ],
  },
  {
    key: 'exitClearance',
    name: 'Exit Clearance',
    description: 'Structured checkout process ensuring all dues are settled before a tenant exits.',
    features: [
      { key: 'clearanceWorkflow', name: 'Clearance Workflow', description: 'Step-by-step clearance: dues check, deposit refund, key return.', wired: true },
      { key: 'dueBillSettlement', name: 'Due Bill Settlement', description: 'Automatically surface outstanding bills during exit clearance.', wired: true },
    ],
  },
  {
    key: 'activityLog',
    name: 'Activity Log',
    description: 'Comprehensive audit trail of all actions taken in the workspace.',
    features: [
      { key: 'exportLog', name: 'Export Activity Log', description: 'Download the activity log as CSV for compliance or review.', wired: true },
      { key: 'filterByUser', name: 'Filter by User', description: 'Filter log entries by a specific staff member or owner.', wired: true },
    ],
  },
  {
    key: 'inquiries',
    name: 'Inquiries',
    description: 'Track inbound leads and prospective tenant / member inquiries.',
    features: [
      { key: 'inquiryTracking', name: 'Inquiry Pipeline', description: 'Track inquiries through new → contacted → converted → lost stages.', wired: true },
      { key: 'inquiryConversion', name: 'One-Click Conversion', description: 'Convert a qualified inquiry directly into a tenant or member.', wired: true },
    ],
  },
]

/** Map from module key to definition — O(1) lookup */
export const MODULE_MAP = new Map<string, ModuleDefinition>(
  MODULES_CATALOG.map((m) => [m.key, m])
)

export const ALL_MODULE_KEYS = MODULES_CATALOG.map((m) => m.key)
