/**
 * Application-wide constants
 * CQ-010: Centralized magic numbers and configuration values
 */

// ============================================
// Time Constants (milliseconds)
// ============================================

/** One second in milliseconds */
export const ONE_SECOND_MS = 1000

/** One minute in milliseconds */
export const ONE_MINUTE_MS = 60 * 1000

/** One hour in milliseconds */
export const ONE_HOUR_MS = 60 * 60 * 1000

/** One day in milliseconds */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000

// ============================================
// Auth & Session Constants
// ============================================

/** Timeout for auth initialization (ms) - if no auth event fires, assume not logged in */
export const AUTH_INIT_TIMEOUT_MS = 3000

/**
 * AUTH-012: Buffer before token expiry to trigger refresh (seconds)
 * Reduced from 30s to 15s to avoid unnecessary refreshes during network latency.
 * 15 seconds provides enough buffer for the refresh call while minimizing
 * premature token refreshes.
 */
export const TOKEN_REFRESH_BUFFER_SECONDS = 15

/** Session check interval (ms) */
export const SESSION_CHECK_INTERVAL_MS = 60 * 1000

/** Maximum retry attempts for auth operations */
export const AUTH_MAX_RETRY_ATTEMPTS = 3

/** Delay between auth retries (ms) */
export const AUTH_RETRY_DELAY_MS = 1000

/** Base retry delay for exponential backoff (ms) */
export const AUTH_BASE_RETRY_DELAY_MS = 500

/** Maximum retry delay cap for exponential backoff (ms) */
export const AUTH_MAX_RETRY_DELAY_MS = 10000

/** Session refresh buffer - refresh this many ms before expiry */
export const SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000

// ============================================
// Toast & UI Notification Constants
// ============================================

/** Default toast duration (ms) */
export const TOAST_DURATION_DEFAULT_MS = 3000

/** Extended toast duration for errors/debugging (ms) */
export const TOAST_DURATION_ERROR_MS = 10000

/** Maximum toast width (px) */
export const TOAST_MAX_WIDTH_PX = 500

// ============================================
// API & Request Constants
// ============================================

/** Default API timeout (ms) */
export const API_TIMEOUT_MS = 30000

/** PDF generation timeout (ms) */
export const PDF_GENERATION_TIMEOUT_MS = 30000

/** Feature flags cache TTL (ms) */
export const FEATURE_FLAGS_CACHE_TTL_MS = 5 * 60 * 1000

// ============================================
// Pagination Constants
// ============================================

/** Default page size for list views */
export const DEFAULT_PAGE_SIZE = 20

/** Maximum page size for API requests */
export const MAX_PAGE_SIZE = 100

/** Default events limit for journey timeline */
export const JOURNEY_EVENTS_LIMIT = 50

// ============================================
// Validation Constants
// ============================================

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 8

/** Maximum file upload size (bytes) - 5MB */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Indian mobile number length (without country code) */
export const INDIAN_MOBILE_LENGTH = 10

// ============================================
// Analytics & Scoring Constants
// ============================================

/** Maximum payment score */
export const MAX_PAYMENT_SCORE = 100

/** Overdue amount divisor for penalty calculation (rupees) */
export const OVERDUE_PENALTY_DIVISOR = 1000

/** Maximum overdue penalty points */
export const MAX_OVERDUE_PENALTY = 20

/** New tenant base payment score */
export const NEW_TENANT_PAYMENT_SCORE = 60

/** Perfect payment bonus points */
export const PERFECT_PAYMENT_BONUS = 10
