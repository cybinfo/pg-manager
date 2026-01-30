/**
 * useFormState Hook
 *
 * Centralized form state management to eliminate duplicate useState + handleChange patterns.
 * Handles text inputs, checkboxes, selects, and complex nested updates.
 *
 * @example
 * const { formData, handleChange, setField, resetForm } = useFormState({
 *   name: "",
 *   email: "",
 *   active: false,
 * })
 *
 * <input name="name" value={formData.name} onChange={handleChange} />
 * <input name="active" type="checkbox" checked={formData.active} onChange={handleChange} />
 */

"use client"

import { useState, useCallback, ChangeEvent } from "react"

// ============================================================================
// TYPES
// ============================================================================

type FormValue = string | number | boolean | null | undefined | string[] | Record<string, unknown>

type FormData = Record<string, FormValue>

interface UseFormStateOptions<T extends FormData> {
  /** Optional validation function called on every change */
  validate?: (data: T) => Record<string, string | null>
  /** Optional transform function to modify values before setting */
  transform?: (name: keyof T, value: FormValue) => FormValue
  /** Optional callback when form data changes */
  onChange?: (data: T) => void
}

interface UseFormStateReturn<T extends FormData> {
  /** Current form data state */
  formData: T
  /** Generic change handler for inputs, selects, textareas */
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  /** Set a specific field value */
  setField: <K extends keyof T>(name: K, value: T[K]) => void
  /** Set multiple fields at once */
  setFields: (fields: Partial<T>) => void
  /** Reset form to initial values */
  resetForm: () => void
  /** Update entire form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>
  /** Validation errors (if validate function provided) */
  errors: Record<string, string | null>
  /** Check if form has any changes from initial state */
  isDirty: boolean
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for form state management
 *
 * Reduces boilerplate for form handling across 12+ pages
 */
export function useFormState<T extends FormData>(
  initialState: T,
  options: UseFormStateOptions<T> = {}
): UseFormStateReturn<T> {
  const { validate, transform, onChange } = options

  const [formData, setFormData] = useState<T>(initialState)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [initialSnapshot] = useState<T>(initialState)

  /**
   * Generic change handler for form inputs
   * Handles:
   * - Text inputs (value)
   * - Checkboxes (checked)
   * - Number inputs (converts to number)
   * - Select elements (value)
   * - Textareas (value)
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      let processedValue: FormValue

      if (type === "checkbox") {
        processedValue = (e.target as HTMLInputElement).checked
      } else if (type === "number") {
        processedValue = value === "" ? "" : Number(value)
      } else {
        processedValue = value
      }

      // Apply optional transform
      if (transform) {
        processedValue = transform(name as keyof T, processedValue)
      }

      setFormData((prev) => {
        const newData = { ...prev, [name]: processedValue }

        // Run validation if provided
        if (validate) {
          setErrors(validate(newData as T))
        }

        // Call onChange callback if provided
        if (onChange) {
          onChange(newData as T)
        }

        return newData as T
      })
    },
    [transform, validate, onChange]
  )

  /**
   * Set a specific field value programmatically
   */
  const setField = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      setFormData((prev) => {
        const newData = { ...prev, [name]: value }

        if (validate) {
          setErrors(validate(newData as T))
        }

        if (onChange) {
          onChange(newData as T)
        }

        return newData as T
      })
    },
    [validate, onChange]
  )

  /**
   * Set multiple fields at once
   */
  const setFields = useCallback(
    (fields: Partial<T>) => {
      setFormData((prev) => {
        const newData = { ...prev, ...fields }

        if (validate) {
          setErrors(validate(newData as T))
        }

        if (onChange) {
          onChange(newData as T)
        }

        return newData as T
      })
    },
    [validate, onChange]
  )

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialState)
    setErrors({})
  }, [initialState])

  /**
   * Check if form has changes from initial state
   */
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialSnapshot)

  return {
    formData,
    handleChange,
    setField,
    setFields,
    resetForm,
    setFormData,
    errors,
    isDirty,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper to create form initial state from an entity with null coalescing
 */
export function createFormDefaults<T extends Record<string, unknown>>(
  entity: Partial<T> | null | undefined,
  defaults: T
): T {
  if (!entity) return defaults

  const result = { ...defaults }
  for (const key in defaults) {
    if (entity[key] !== undefined && entity[key] !== null) {
      result[key] = entity[key] as T[typeof key]
    }
  }
  return result
}
