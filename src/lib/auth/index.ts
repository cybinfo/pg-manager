// ============================================
// Unified Identity System - Exports
// ============================================

// Types
export * from './types'

// Context and Hooks
export {
  AuthProvider,
  useAuth,
  usePermission,
  usePermissions,
  useCurrentContext,
} from './auth-context'

// Session Management (Centralized)
export {
  getSession,
  getUser,
  refreshSession,
  signOut,
  isSessionValid,
  requireSession,
  isSessionExpired,
  getSessionExpiryTime,
  getTimeUntilExpiry,
  getStoredContextId,
  setStoredContextId,
  clearStoredContextId,
  createSessionError,
} from './session'
export type {
  SessionResult,
  SessionError,
  SessionErrorCode,
  SessionState,
  SessionEventType,
  SessionEvent,
} from './session'

// Session Hooks
export {
  useSession,
  useIsAuthenticated,
  useCurrentUser,
} from './use-session'

// AI Detection
export {
  detectIdentityConflicts,
  findExistingUser,
  checkContextAnomalies,
  logPermissionCheck,
  getSuggestionsForIdentity,
  validateInvitation,
} from './ai-detection'
export type { Anomaly, AnomalyType, LinkSuggestion, InvitationValidation } from './ai-detection'

// Analytics
export {
  getContextMetrics,
  getPermissionUsage,
  getUserSwitchPatterns,
  getStaffProductivity,
  getAnalyticsSummary,
  trackAction,
  exportToCSV,
} from './analytics'
export type {
  ContextMetrics,
  PermissionUsage,
  SwitchPattern,
  StaffProductivity,
  AnalyticsSummary,
} from './analytics'
