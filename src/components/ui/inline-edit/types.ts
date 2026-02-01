/**
 * Inline Edit Types
 *
 * Shared types for inline editing components.
 */

export type EditType = "text" | "number" | "select" | "date" | "boolean"

export interface EditValidation {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  custom?: (value: unknown) => string | null // Return error message or null
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface InlineEditBaseProps {
  /** Current value */
  value: unknown
  /** Field name for updates */
  field: string
  /** Edit input type */
  editType: EditType
  /** Options for select type */
  editOptions?: SelectOption[]
  /** Validation rules */
  validation?: EditValidation
  /** Callback when save is triggered */
  onSave: (field: string, value: unknown) => Promise<boolean>
  /** Whether editing is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
}

/**
 * Validate a value against validation rules
 */
export function validateValue(
  value: unknown,
  validation: EditValidation | undefined
): string | null {
  if (!validation) return null

  // Required check
  if (validation.required) {
    if (value === null || value === undefined || value === "") {
      return "This field is required"
    }
  }

  // Skip other validations if value is empty and not required
  if (value === null || value === undefined || value === "") {
    return null
  }

  // Number validations
  if (typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)))) {
    const numValue = Number(value)

    if (validation.min !== undefined && numValue < validation.min) {
      return `Minimum value is ${validation.min}`
    }

    if (validation.max !== undefined && numValue > validation.max) {
      return `Maximum value is ${validation.max}`
    }
  }

  // String validations
  if (typeof value === "string") {
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      return `Minimum length is ${validation.minLength} characters`
    }

    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      return `Maximum length is ${validation.maxLength} characters`
    }

    if (validation.pattern && !validation.pattern.test(value)) {
      return validation.patternMessage || "Invalid format"
    }
  }

  // Custom validation
  if (validation.custom) {
    return validation.custom(value)
  }

  return null
}
