/**
 * Centralized UI Messages
 *
 * Single source of truth for toast messages, error messages, and UI text.
 * Import from here instead of hardcoding strings across the codebase.
 *
 * @example
 * import { MESSAGES, toastSuccess, toastError } from "@/lib/messages"
 *
 * toast.error(MESSAGES.auth.sessionExpired)
 * toastSuccess.create("Tenant")  // "Tenant created successfully"
 */

// ============================================================================
// AUTHENTICATION MESSAGES
// ============================================================================

export const AUTH_MESSAGES = {
  sessionExpired: "Session expired. Please login again.",
  loginSuccess: "Welcome back!",
  loginFailed: "Invalid email or password",
  logoutSuccess: "Logged out successfully",
  registerSuccess: "Account created! Please check your email to verify.",
  passwordResetSent: "Password reset link sent to your email",
  passwordResetSuccess: "Password updated successfully",
  emailVerified: "Email verified successfully",
  emailVerifyFailed: "Email verification failed",
  unauthorized: "You are not authorized to perform this action",
  notAuthenticated: "Please log in to continue",
}

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

export const VALIDATION_MESSAGES = {
  requiredFields: "Please fill in all required fields",
  invalidEmail: "Please enter a valid email address",
  invalidPhone: "Please enter a valid phone number",
  invalidAmount: "Please enter a valid amount",
  invalidDate: "Please select a valid date",
  invalidNumber: "Please enter a valid number",
  passwordMismatch: "Passwords do not match",
  passwordTooShort: "Password must be at least 8 characters",
  fileTooLarge: "File size exceeds the maximum limit",
  invalidFileType: "Invalid file type",
  amountPositive: "Amount must be greater than zero",
  dateInPast: "Date cannot be in the past",
  dateInFuture: "Date cannot be in the future",
  selectOption: "Please select an option",
}

// ============================================================================
// CRUD OPERATION MESSAGES
// ============================================================================

export const CRUD_MESSAGES = {
  // Success messages (dynamic)
  createSuccess: (entity: string) => `${entity} created successfully`,
  updateSuccess: (entity: string) => `${entity} updated successfully`,
  deleteSuccess: (entity: string) => `${entity} deleted successfully`,
  saveSuccess: (entity: string) => `${entity} saved successfully`,

  // Error messages
  createFailed: (entity: string) => `Failed to create ${entity.toLowerCase()}`,
  updateFailed: (entity: string) => `Failed to update ${entity.toLowerCase()}`,
  deleteFailed: (entity: string) => `Failed to delete ${entity.toLowerCase()}`,
  saveFailed: (entity: string) => `Failed to save ${entity.toLowerCase()}`,

  // Loading messages
  loadFailed: "Failed to load data",
  loadError: "An error occurred while loading data",
  notFound: (entity: string) => `${entity} not found`,

  // Generic messages
  unexpectedError: "An unexpected error occurred",
  tryAgain: "Please try again later",
  networkError: "Network error. Please check your connection.",
}

// ============================================================================
// SPECIFIC ENTITY MESSAGES
// ============================================================================

export const ENTITY_MESSAGES = {
  tenant: {
    added: "Tenant added successfully",
    updated: "Tenant updated successfully",
    deleted: "Tenant removed successfully",
    checkInSuccess: "Tenant checked in successfully",
    checkOutSuccess: "Tenant checked out successfully",
    noticeGiven: "Notice period started",
  },
  payment: {
    recorded: "Payment recorded successfully",
    receiptSent: "Receipt sent successfully",
    reminderSent: "Payment reminder sent",
  },
  bill: {
    generated: "Bill generated successfully",
    sent: "Bill sent successfully",
    markPaid: "Bill marked as paid",
  },
  complaint: {
    submitted: "Complaint submitted successfully",
    resolved: "Complaint resolved",
    assigned: "Complaint assigned successfully",
  },
  refund: {
    initiated: "Refund initiated successfully",
    processed: "Refund processed successfully",
    cancelled: "Refund cancelled",
  },
  visitor: {
    checkedIn: "Visitor checked in successfully",
    checkedOut: "Visitor checked out successfully",
  },
  document: {
    uploaded: "Document uploaded successfully",
    deleted: "Document deleted successfully",
    verified: "Document verified",
  },
}

// ============================================================================
// SETTINGS MESSAGES
// ============================================================================

export const SETTINGS_MESSAGES = {
  saved: "Settings saved successfully",
  saveFailed: "Failed to save settings",
  chargeTypeAdded: "Charge type added",
  chargeTypeRemoved: "Charge type removed",
  chargeTypeUpdated: "Charge type updated",
  rateUpdated: "Rate updated successfully",
  expenseTypeAdded: "Expense type added",
  expenseTypeRemoved: "Expense type removed",
}

// ============================================================================
// CONSOLIDATED MESSAGES OBJECT
// ============================================================================

export const MESSAGES = {
  auth: AUTH_MESSAGES,
  validation: VALIDATION_MESSAGES,
  crud: CRUD_MESSAGES,
  entity: ENTITY_MESSAGES,
  settings: SETTINGS_MESSAGES,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Shorthand for common success toasts
 */
export const toastSuccess = {
  create: (entity: string) => CRUD_MESSAGES.createSuccess(entity),
  update: (entity: string) => CRUD_MESSAGES.updateSuccess(entity),
  delete: (entity: string) => CRUD_MESSAGES.deleteSuccess(entity),
  save: (entity: string) => CRUD_MESSAGES.saveSuccess(entity),
}

/**
 * Shorthand for common error toasts
 */
export const toastError = {
  create: (entity: string) => CRUD_MESSAGES.createFailed(entity),
  update: (entity: string) => CRUD_MESSAGES.updateFailed(entity),
  delete: (entity: string) => CRUD_MESSAGES.deleteFailed(entity),
  save: (entity: string) => CRUD_MESSAGES.saveFailed(entity),
  load: CRUD_MESSAGES.loadFailed,
  notFound: (entity: string) => CRUD_MESSAGES.notFound(entity),
  unexpected: CRUD_MESSAGES.unexpectedError,
  network: CRUD_MESSAGES.networkError,
}
