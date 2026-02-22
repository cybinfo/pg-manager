/**
 * useFormValidation Hook
 *
 * Field-level validation for form pages. Works standalone or integrated
 * with useFormPage via the `validationSchema` option.
 *
 * Validators return { isValid, error } or null (skip validation).
 * Integrates with FormField's `error` prop for inline error display.
 *
 * @example
 * const schema: ValidationSchema<MyForm> = {
 *   name: (v) => !String(v).trim() ? { isValid: false, error: "Name is required" } : null,
 *   amount: (v) => validatePositiveAmount(v, "Amount"),
 * }
 *
 * const { errors, validateField, validateAll, clearErrors } = useFormValidation(schema, formData)
 *
 * <FormField label="Name" error={errors.name}>
 *   <Input name="name" value={formData.name} onChange={handleChange} onBlur={() => validateField("name")} />
 * </FormField>
 */

"use client"

import { useState, useCallback, useRef } from "react"

// ============================================================================
// TYPES
// ============================================================================

/** Validator result — return null to skip (field is valid) */
export type ValidatorResult = { isValid: boolean; error?: string | null } | null

/** Single field validator function. Receives field value and entire form data. */
export type FieldValidator<T> = (value: unknown, formData: T) => ValidatorResult

/** Map of field names to their validator functions */
export type ValidationSchema<T> = {
  [K in keyof T]?: FieldValidator<T>
}

export interface UseFormValidationReturn<T> {
  /** Current field errors (keyed by field name) */
  errors: Partial<Record<keyof T, string>>
  /** Validate a single field. Returns true if valid. */
  validateField: (field: keyof T) => boolean
  /** Validate all fields in the schema. Returns true if all valid. */
  validateAll: (formData: T) => boolean
  /** Set a specific field error manually */
  setFieldError: (field: keyof T, error?: string) => void
  /** Clear all errors */
  clearErrors: () => void
  /** Clear a single field's error */
  clearFieldError: (field: keyof T) => void
  /** Whether any errors exist */
  hasErrors: boolean
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormValidation<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>,
  formData: T
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const schemaRef = useRef(schema)
  schemaRef.current = schema

  const validateField = useCallback(
    (field: keyof T): boolean => {
      const validator = schemaRef.current[field]
      if (!validator) return true

      const result = validator(formData[field], formData)
      if (!result || result.isValid) {
        setErrors((prev) => {
          if (!(field in prev)) return prev
          const next = { ...prev }
          delete next[field]
          return next
        })
        return true
      }

      setErrors((prev) => ({ ...prev, [field]: result.error || "Invalid" }))
      return false
    },
    [formData]
  )

  const validateAll = useCallback(
    (data: T): boolean => {
      const newErrors: Partial<Record<keyof T, string>> = {}
      let allValid = true

      for (const field of Object.keys(schemaRef.current) as (keyof T)[]) {
        const validator = schemaRef.current[field]
        if (!validator) continue

        const result = validator(data[field], data)
        if (result && !result.isValid) {
          newErrors[field] = result.error || "Invalid"
          allValid = false
        }
      }

      setErrors(newErrors)
      return allValid
    },
    []
  )

  const setFieldError = useCallback((field: keyof T, error?: string) => {
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }))
    } else {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const hasErrors = Object.keys(errors).length > 0

  return {
    errors,
    validateField,
    validateAll,
    setFieldError,
    clearErrors,
    clearFieldError,
    hasErrors,
  }
}
