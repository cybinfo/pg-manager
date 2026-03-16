/**
 * Field-Level Validators for useFormPage's validationSchema
 *
 * These return ValidatorResult (from useFormValidation) so they can be
 * used directly as values in a ValidationSchema object.
 *
 * @example
 * import { requiredField, requiredAmount, requiredPhone } from "@/lib/validation/field-validators"
 *
 * const validationSchema = {
 *   name: requiredField("Name"),
 *   amount: requiredAmount("Amount"),
 *   phone: requiredPhone(),
 * }
 */

import type { ValidatorResult } from "@/lib/hooks/useFormValidation"

/**
 * Validates that a string field is non-empty.
 */
export function requiredField(label: string) {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) {
      return { isValid: false, error: `${label} is required` }
    }
    return null
  }
}

/**
 * Validates that a select/combobox field has a value selected.
 */
export function requiredSelect(label: string) {
  return (value: unknown): ValidatorResult => {
    if (!value || String(value).trim() === "") {
      return { isValid: false, error: `Please select a ${label.toLowerCase()}` }
    }
    return null
  }
}

/**
 * Validates that an amount is a positive number.
 */
export function requiredAmount(label = "Amount") {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) {
      return { isValid: false, error: `${label} is required` }
    }
    const num = parseFloat(str)
    if (isNaN(num) || num <= 0) {
      return { isValid: false, error: `${label} must be greater than zero` }
    }
    return null
  }
}

/**
 * Validates that an amount is zero or positive (optional but if provided must be valid).
 */
export function optionalAmount(label = "Amount") {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) return null // optional
    const num = parseFloat(str)
    if (isNaN(num) || num < 0) {
      return { isValid: false, error: `${label} cannot be negative` }
    }
    return null
  }
}

/**
 * Validates a required date field.
 */
export function requiredDate(label = "Date") {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) {
      return { isValid: false, error: `${label} is required` }
    }
    return null
  }
}

/**
 * Validates a 10-digit Indian phone number.
 */
export function requiredPhone(label = "Phone number") {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) {
      return { isValid: false, error: `${label} is required` }
    }
    if (!/^\d{10}$/.test(str)) {
      return { isValid: false, error: `${label} must be 10 digits` }
    }
    return null
  }
}

/**
 * Validates an optional email field (if provided, must be valid format).
 */
export function optionalEmail(label = "Email") {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) return null // optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      return { isValid: false, error: `${label} format is invalid` }
    }
    return null
  }
}

/**
 * Validates a required positive integer field.
 */
export function requiredPositiveInt(label: string) {
  return (value: unknown): ValidatorResult => {
    const str = String(value ?? "").trim()
    if (!str) {
      return { isValid: false, error: `${label} is required` }
    }
    const num = parseInt(str, 10)
    if (isNaN(num) || num < 1) {
      return { isValid: false, error: `${label} must be at least 1` }
    }
    return null
  }
}
