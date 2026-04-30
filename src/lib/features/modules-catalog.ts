import type { ModuleCatalog, ModuleDefinition } from './types'

export const MODULES_CATALOG: ModuleCatalog = [
  {
    key: 'properties',
    name: 'Properties',
    description: 'Manage buildings, floors, and property details across all your locations.',
    features: [
      { key: 'architectureView', name: 'Architecture View', description: '2D visual map of your property layout, rooms, and beds.' },
      { key: 'publicWebsite', name: 'Public Website', description: 'Public-facing website for your property at managekar.com/pg/slug.' },
      { key: 'maintenanceMode', name: 'Maintenance Mode', description: 'Mark properties or rooms as under maintenance to block new bookings.' },
    ],
  },
  {
    key: 'rooms',
    name: 'Rooms',
    description: 'Manage rooms, beds, occupancy, and room configurations.',
    features: [
      { key: 'bedCapacityTracking', name: 'Bed Capacity Tracking', description: 'Track individual beds within shared rooms.' },
      { key: 'roomTypeClassification', name: 'Room Type Classification', description: 'Classify rooms as single, double, triple, dormitory, etc.' },
      { key: 'amenityTracking', name: 'Amenity Tracking', description: 'Track room-level amenities (AC, TV, attached bath, etc.).' },
    ],
  },
  {
    key: 'tenants',
    name: 'Tenants',
    description: 'Manage tenant lifecycle from onboarding to exit.',
    features: [
      { key: 'tenantPortal', name: 'Tenant Self-Service Portal', description: 'Tenants can view bills, make payments, and raise complaints via their own portal.' },
      { key: 'welcomeEmail', name: 'Welcome Email', description: 'Send automated welcome email when a tenant is onboarded.' },
      { key: 'policeVerification', name: 'Police Verification Tracking', description: 'Track police verification status for each tenant.' },
      { key: 'documentsUpload', name: 'Document Management', description: 'Collect and store ID proofs and other tenant documents.' },
    ],
  },
  {
    key: 'members',
    name: 'Members',
    description: 'Manage library memberships, subscriptions, and member lifecycle.',
    features: [
      { key: 'memberPortal', name: 'Member Self-Service Portal', description: 'Members can view attendance, hours balance, and payments via their own portal.' },
      { key: 'welcomeEmail', name: 'Welcome Email', description: 'Send automated welcome email when a member is added.' },
      { key: 'hoursTracking', name: 'Daily Hours Tracking', description: 'Track daily hours balance (per-day allowance model).' },
      { key: 'memberQrCode', name: 'Member QR Code', description: 'Generate QR code per member for quick check-in.' },
    ],
  },
  {
    key: 'people',
    name: 'People',
    description: 'Central directory for all individuals across your business. Single source of truth for contact data.',
    features: [
      { key: 'mergeDetection', name: 'Duplicate Detection', description: 'Automatically detect and flag duplicate people records by phone or email.' },
      { key: 'emergencyContacts', name: 'Emergency Contacts', description: 'Store and display emergency contact details per person.' },
      { key: 'tagging', name: 'People Tagging', description: 'Add custom tags to people for grouping and filtering.' },
    ],
  },
  {
    key: 'billing',
    name: 'Billing',
    description: 'Generate and manage bills, rent invoices, and utility charges.',
    features: [
      { key: 'autoBilling', name: 'Auto Billing', description: 'Automatically generate monthly rent bills on a scheduled day.' },
      { key: 'proRataBilling', name: 'Pro-Rata Billing', description: 'Calculate partial-month bills for mid-cycle joins or exits.' },
      { key: 'gstInvoicing', name: 'GST Invoicing', description: 'Include GST breakdown on invoices (CGST + SGST).' },
      { key: 'lateFeePenalty', name: 'Late Fee / Penalty', description: 'Automatically add late payment fees after the due date.' },
    ],
  },
  {
    key: 'payments',
    name: 'Payments',
    description: 'Record and track incoming payments from tenants and members.',
    features: [
      { key: 'paymentReceipts', name: 'Payment Receipts', description: 'Generate and email payment receipts automatically on recording.' },
      { key: 'paymentReminders', name: 'Payment Reminders', description: 'Send automated reminders before and after due dates.' },
      { key: 'bulkPaymentRecording', name: 'Bulk Payment Recording', description: 'Record multiple payments in one go.' },
      { key: 'reconciliation', name: 'Payment Reconciliation', description: '2-panel UI to match unlinked payments to outstanding bills.' },
    ],
  },
  {
    key: 'refunds',
    name: 'Refunds',
    description: 'Manage tenant and member refund requests and processing.',
    features: [
      { key: 'refundApproval', name: 'Refund Approval Workflow', description: 'Require owner approval before processing refunds.' },
      { key: 'autoRefundCalculation', name: 'Auto Refund Calculation', description: 'Automatically calculate deposit refund amount on exit.' },
    ],
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    description: 'Manage recurring library memberships with plan, duration, and payment tracking.',
    features: [
      { key: 'renewalReminders', name: 'Renewal Reminders', description: 'Send email reminders when membership is expiring soon.' },
      { key: 'partialPayment', name: 'Partial Payment Support', description: 'Allow recording partial payments against a subscription.' },
      { key: 'subscriptionHistory', name: 'Subscription History', description: 'View full history of all subscriptions per member.' },
    ],
  },
  {
    key: 'plans',
    name: 'Plans',
    description: 'Define subscription plans with hours, duration, and pricing.',
    features: [
      { key: 'planExpiry', name: 'Plan Expiry Management', description: 'Automatically expire plans when duration ends.' },
      { key: 'planUsageTracking', name: 'Plan Usage Tracking', description: 'Show how many members are on each plan.' },
    ],
  },
  {
    key: 'expenses',
    name: 'Expenses',
    description: 'Track all property-related expenses: daily spend, vendor bills, services.',
    features: [
      { key: 'vendorManagement', name: 'Vendor Management', description: 'Maintain a directory of vendors and shop records.' },
      { key: 'serviceTracking', name: 'Service & Provider Tracking', description: 'Track recurring service providers and their invoices.' },
      { key: 'billPayments', name: 'Bill Payments', description: 'Record utility bill payments (electricity, water, etc.).' },
      { key: 'dailySpend', name: 'Daily Spend Log', description: 'Quick entry for day-to-day small expenses.' },
      { key: 'miscTransactions', name: 'Misc Transactions', description: 'Miscellaneous credit/debit transactions outside standard categories.' },
    ],
  },
  {
    key: 'meters',
    name: 'Meters',
    description: 'Track physical utility meters and monthly consumption readings.',
    features: [
      { key: 'meterReadings', name: 'Meter Readings', description: 'Record monthly meter readings and compute consumption per room.' },
      { key: 'consumptionAlerts', name: 'Consumption Alerts', description: 'Alert when consumption is unusually high or low.' },
      { key: 'perRoomMetering', name: 'Per-Room Metering', description: 'Assign individual meters to rooms for per-room billing.' },
    ],
  },
  {
    key: 'attendance',
    name: 'Attendance',
    description: 'Track member check-in and check-out times in the library.',
    features: [
      { key: 'qrCheckin', name: 'QR Code Check-In', description: 'Members scan their QR code at the gate to check in/out.' },
      { key: 'autoHoursDeduction', name: 'Auto Hours Deduction', description: 'Automatically deduct hours from daily balance on check-out.' },
      { key: 'csvExport', name: 'Attendance CSV Export', description: 'Export attendance records as CSV for reporting.' },
      { key: 'lateEntry', name: 'Late Entry Tracking', description: 'Flag check-ins that occur outside the assigned time slot.' },
    ],
  },
  {
    key: 'seats',
    name: 'Seats',
    description: 'Manage individual study seats within library sections.',
    features: [
      { key: 'seatAssignment', name: 'Seat Assignment', description: 'Assign specific seats to members for dedicated seating.' },
      { key: 'seatReservation', name: 'Seat Reservation', description: 'Allow members to reserve seats in advance.' },
    ],
  },
  {
    key: 'sections',
    name: 'Sections',
    description: 'Manage study areas or halls within the library (AC, Non-AC, etc.).',
    features: [
      { key: 'sectionCapacity', name: 'Section Capacity Tracking', description: 'Track occupied vs. available seats per section.' },
      { key: 'acNonAcTracking', name: 'AC / Non-AC Classification', description: 'Classify sections by comfort level for differential pricing.' },
    ],
  },
  {
    key: 'lockers',
    name: 'Lockers',
    description: 'Manage locker assignments and rentals for library members.',
    features: [
      { key: 'lockerRenewal', name: 'Locker Renewal Reminders', description: 'Notify members when their locker rental is about to expire.' },
      { key: 'lockerHistory', name: 'Assignment History', description: 'Full history of who used each locker.' },
    ],
  },
  {
    key: 'waitlist',
    name: 'Waitlist',
    description: 'Manage prospective members waiting for a seat or membership.',
    features: [
      { key: 'autoQueueing', name: 'Auto Queue Positioning', description: 'Automatically assign queue numbers to new waitlist entries.' },
      { key: 'waitlistNotifications', name: 'Waitlist Notifications', description: 'Notify prospective members when a seat opens up.' },
    ],
  },
  {
    key: 'complaints',
    name: 'Complaints',
    description: 'Receive and resolve complaints from tenants and members.',
    features: [
      { key: 'complaintResolution', name: 'Resolution Tracking', description: 'Track resolution notes and status transitions per complaint.' },
      { key: 'complaintEscalation', name: 'Escalation Alerts', description: 'Alert owner when a complaint has been open beyond a threshold.' },
      { key: 'resolutionEmail', name: 'Resolution Email', description: 'Send email to tenant/member when complaint is resolved.' },
    ],
  },
  {
    key: 'notices',
    name: 'Notices',
    description: 'Send announcements and notices to tenants, members, or all.',
    features: [
      { key: 'broadcastNotices', name: 'Broadcast Notices', description: 'Send a notice to all tenants or all members at once.' },
      { key: 'targetedNotices', name: 'Targeted Notices', description: 'Send notices to specific people or groups.' },
      { key: 'noticeScheduling', name: 'Schedule Notices', description: 'Schedule a notice to go out at a future date and time.' },
    ],
  },
  {
    key: 'visitors',
    name: 'Visitors',
    description: 'Log and track visitors entering the premises.',
    features: [
      { key: 'visitorLog', name: 'Visitor Log', description: 'Record visitor name, purpose, and check-in/out time.' },
      { key: 'gatePassGeneration', name: 'Gate Pass', description: 'Generate a printable gate pass for each visitor.' },
    ],
  },
  {
    key: 'staff',
    name: 'Staff',
    description: 'Manage staff members, roles, and permissions.',
    features: [
      { key: 'staffRoles', name: 'Custom Roles', description: 'Define custom roles with specific permission sets.' },
      { key: 'staffInvitations', name: 'Staff Invitations', description: 'Invite staff via email link — no manual account creation.' },
      { key: 'permissionDeny', name: 'Permission Deny Override', description: 'Explicitly deny specific permissions for individual staff.' },
    ],
  },
  {
    key: 'reports',
    name: 'Reports',
    description: 'Revenue, occupancy, and operational analytics across your business.',
    features: [
      { key: 'revenueReports', name: 'Revenue Reports', description: 'Monthly and annual revenue breakdown by property or library.' },
      { key: 'occupancyReports', name: 'Occupancy Reports', description: 'Track bed/seat occupancy rates over time.' },
      { key: 'csvExport', name: 'CSV Export', description: 'Export any report to CSV for external analysis.' },
      { key: 'paymentAnalytics', name: 'Payment Analytics', description: 'Trend charts for payment volumes by day, week, or month.' },
    ],
  },
  {
    key: 'approvals',
    name: 'Approvals',
    description: 'Workflow for tenant and member self-service requests requiring owner sign-off.',
    features: [
      { key: 'tenantRequests', name: 'Tenant Requests', description: 'Tenants can submit requests for name/address changes or lease renewal.' },
      { key: 'autoApproval', name: 'Auto-Approval Rules', description: 'Define rules to automatically approve low-risk requests.' },
    ],
  },
  {
    key: 'exitClearance',
    name: 'Exit Clearance',
    description: 'Structured checkout process ensuring all dues are settled before a tenant exits.',
    features: [
      { key: 'clearanceWorkflow', name: 'Clearance Workflow', description: 'Step-by-step clearance: dues check, deposit refund, key return.' },
      { key: 'dueBillSettlement', name: 'Due Bill Settlement', description: 'Automatically surface outstanding bills during exit clearance.' },
    ],
  },
  {
    key: 'activityLog',
    name: 'Activity Log',
    description: 'Comprehensive audit trail of all actions taken in the workspace.',
    features: [
      { key: 'exportLog', name: 'Export Activity Log', description: 'Download the activity log as CSV for compliance or review.' },
      { key: 'filterByUser', name: 'Filter by User', description: 'Filter log entries by a specific staff member or owner.' },
    ],
  },
  {
    key: 'inquiries',
    name: 'Inquiries',
    description: 'Track inbound leads and prospective tenant / member inquiries.',
    features: [
      { key: 'inquiryTracking', name: 'Inquiry Pipeline', description: 'Track inquiries through new → contacted → converted → lost stages.' },
      { key: 'inquiryConversion', name: 'One-Click Conversion', description: 'Convert a qualified inquiry directly into a tenant or member.' },
    ],
  },
]

/** Map from module key to definition — O(1) lookup */
export const MODULE_MAP = new Map<string, ModuleDefinition>(
  MODULES_CATALOG.map((m) => [m.key, m])
)

export const ALL_MODULE_KEYS = MODULES_CATALOG.map((m) => m.key)
