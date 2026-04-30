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
export { PermissionGuard, OwnerGuard, PlatformAdminGuard, withPermission } from './permission-guard'

// Invitation Components
export { InvitationForm } from './invitation-form'
export { InvitationList } from './invitation-list'
export { AcceptInvitation } from './accept-invitation'

// Session Timeout
export { SessionTimeout, useSessionTimeout } from './session-timeout'

// Email Verification
export { EmailVerificationCard } from './email-verification-card'

// Module & Feature Gates
export { ModuleGate, FeatureGate, useModuleCheck, useFeatureCheck } from './feature-gate'
export { ModuleGuard } from './module-guard'
export { FeatureGuard } from './feature-guard'

// Auth Card Layout (shared layout for auth pages)
export { AuthCardLayout } from './auth-card-layout'
