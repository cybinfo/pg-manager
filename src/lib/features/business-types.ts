import type { BusinessType, ModuleKey } from './types'

export interface BusinessTypeDefinition {
  key: BusinessType
  label: string
  description: string
  /** Modules pre-suggested when this business type is created (not forced) */
  suggestedModules: ModuleKey[]
}

export const BUSINESS_TYPES: BusinessTypeDefinition[] = [
  {
    key: 'pg',
    label: 'PG / Paying Guest',
    description: 'Paying guest accommodation with rooms, tenants, and billing.',
    suggestedModules: [
      'properties', 'rooms', 'tenants', 'billing', 'payments', 'refunds',
      'complaints', 'notices', 'approvals', 'exitClearance', 'reports',
      'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'hostel',
    label: 'Hostel',
    description: 'Hostel or dormitory with shared rooms and short-term stays.',
    suggestedModules: [
      'properties', 'rooms', 'tenants', 'billing', 'payments', 'refunds',
      'complaints', 'notices', 'reports', 'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'library',
    label: 'Study Library',
    description: 'Study space with hourly-access memberships, seats, and lockers.',
    suggestedModules: [
      'members', 'sections', 'seats', 'attendance', 'lockers', 'waitlist',
      'subscriptions', 'plans', 'complaints', 'notices', 'reports',
      'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'gym',
    label: 'Gym / Fitness Centre',
    description: 'Gym with memberships, attendance tracking, and locker management.',
    suggestedModules: [
      'members', 'subscriptions', 'plans', 'attendance', 'lockers',
      'billing', 'payments', 'complaints', 'notices', 'reports',
      'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'school',
    label: 'School / Coaching',
    description: 'Educational institution with students, fees, and attendance.',
    suggestedModules: [
      'members', 'subscriptions', 'plans', 'attendance', 'billing', 'payments',
      'complaints', 'notices', 'reports', 'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'hospital',
    label: 'Hospital / Clinic',
    description: 'Healthcare facility with patient management and billing.',
    suggestedModules: [
      'people', 'billing', 'payments', 'complaints', 'notices',
      'reports', 'activityLog', 'staff', 'inquiries',
    ],
  },
  {
    key: 'hotel',
    label: 'Hotel / Guest House',
    description: 'Short-stay accommodation with rooms and guest management.',
    suggestedModules: [
      'properties', 'rooms', 'tenants', 'billing', 'payments', 'refunds',
      'visitors', 'notices', 'reports', 'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'coworking',
    label: 'Co-Working Space',
    description: 'Shared office with seats, memberships, and locker rentals.',
    suggestedModules: [
      'members', 'sections', 'seats', 'subscriptions', 'plans', 'lockers',
      'billing', 'payments', 'complaints', 'notices', 'reports',
      'activityLog', 'staff', 'people', 'inquiries',
    ],
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Any other business type — start with core modules and add as needed.',
    suggestedModules: [
      'billing', 'payments', 'people', 'reports', 'activityLog', 'staff',
    ],
  },
]

export const BUSINESS_TYPE_MAP = new Map<BusinessType, BusinessTypeDefinition>(
  BUSINESS_TYPES.map((b) => [b.key, b])
)

export function getSuggestedModules(businessType: BusinessType): ModuleKey[] {
  return BUSINESS_TYPE_MAP.get(businessType)?.suggestedModules ?? []
}

export const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((b) => ({
  value: b.key,
  label: b.label,
}))

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = Object.fromEntries(
  BUSINESS_TYPES.map((b) => [b.key, b.label])
) as Record<BusinessType, string>
