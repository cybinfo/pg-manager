// ============================================
// Auth Components - Exports
// ============================================

// Context Picker (for login)
export { ContextPicker, CompactContextPicker } from './context-picker'

// Context Switcher (for header)
export { ContextSwitcher, MobileContextSwitcher } from './context-switcher'

// Permission Gates
export {
  PermissionGate,
  AccessDenied,
  RoleGate,
  OwnerOnly,
  StaffOnly,
  TenantOnly,
  PermissionBadge,
  UpgradePrompt,
} from './permission-gate'

// Permission Guard (for page-level access control)
export { PermissionGuard, OwnerGuard, withPermission } from './permission-guard'

// Invitation Components
export { InvitationForm, InvitationList, AcceptInvitation } from './invitation-components'

// Session Timeout
export { SessionTimeout, useSessionTimeout } from './session-timeout'

// Email Verification
export { EmailVerificationCard } from './email-verification-card'

// Feature Gates
export { FeatureGate, useFeatureCheck } from './feature-gate'
