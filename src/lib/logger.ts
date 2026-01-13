/**
 * Structured Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured metadata
 * - Environment-aware output (silent in production for debug)
 * - Context-aware logging (module names)
 *
 * Usage:
 * ```typescript
 * import { logger } from "@/lib/logger"
 *
 * // Simple logging
 * logger.info("User logged in", { userId: "123" })
 * logger.error("Failed to process payment", { error, paymentId })
 *
 * // Module-specific logger
 * const log = logger.child("auth")
 * log.info("Session created")
 * ```
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogMeta {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  module?: string
  meta?: LogMeta
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Environment configuration
const isDevelopment = process.env.NODE_ENV === "development"
const isTest = process.env.NODE_ENV === "test"
const minLevel: LogLevel = isDevelopment ? "debug" : "info"

function shouldLog(level: LogLevel): boolean {
  if (isTest) return false // Silent in tests
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel]
}

function formatLogEntry(entry: LogEntry): string {
  const { level, message, timestamp, module, meta } = entry
  const prefix = module ? `[${module}]` : ""
  const metaStr = meta && Object.keys(meta).length > 0
    ? ` ${JSON.stringify(meta)}`
    : ""
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${metaStr}`
}

function createLogEntry(
  level: LogLevel,
  message: string,
  meta?: LogMeta,
  module?: string
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    module,
    meta,
  }
}

function logToConsole(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return

  const formatted = formatLogEntry(entry)

  switch (entry.level) {
    case "debug":
      console.debug(formatted)
      break
    case "info":
      console.info(formatted)
      break
    case "warn":
      console.warn(formatted)
      break
    case "error":
      console.error(formatted)
      break
  }
}

class Logger {
  private module?: string

  constructor(module?: string) {
    this.module = module
  }

  private log(level: LogLevel, message: string, meta?: LogMeta): void {
    const entry = createLogEntry(level, message, meta, this.module)
    logToConsole(entry)
  }

  debug(message: string, meta?: LogMeta): void {
    this.log("debug", message, meta)
  }

  info(message: string, meta?: LogMeta): void {
    this.log("info", message, meta)
  }

  warn(message: string, meta?: LogMeta): void {
    this.log("warn", message, meta)
  }

  error(message: string, meta?: LogMeta): void {
    this.log("error", message, meta)
  }

  /**
   * Create a child logger with a specific module name
   */
  child(module: string): Logger {
    const childModule = this.module ? `${this.module}:${module}` : module
    return new Logger(childModule)
  }
}

// Export singleton logger instance
export const logger = new Logger()

// Export named loggers for common modules
export const authLogger = logger.child("auth")
export const apiLogger = logger.child("api")
export const workflowLogger = logger.child("workflow")
export const cronLogger = logger.child("cron")
export const dbLogger = logger.child("db")

// Helper to extract error details for logging
export function extractErrorMeta(error: unknown): LogMeta {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: isDevelopment ? error.stack : undefined,
    }
  }
  return { error: String(error) }
}
