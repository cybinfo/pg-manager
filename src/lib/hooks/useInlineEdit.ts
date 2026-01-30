/**
 * useInlineEdit Hook
 *
 * Centralized inline editing state management for detail pages.
 * Eliminates duplicate editing patterns in complaints, notices, exit-clearance.
 *
 * @example
 * const edit = useInlineEdit({
 *   initialData: complaint,
 *   onSave: async (data) => {
 *     await supabase.from("complaints").update(data).eq("id", complaint.id)
 *   },
 *   successMessage: "Complaint updated",
 * })
 *
 * {edit.isEditing ? (
 *   <form onSubmit={edit.handleSubmit}>
 *     <Input value={edit.editData.status} onChange={edit.handleChange} />
 *     <Button onClick={edit.handleSave}>Save</Button>
 *     <Button onClick={edit.cancel}>Cancel</Button>
 *   </form>
 * ) : (
 *   <Button onClick={edit.startEditing}>Edit</Button>
 * )}
 */

"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

interface UseInlineEditOptions<T> {
  /** Initial data to edit */
  initialData: T
  /** Save handler */
  onSave: (data: T) => Promise<void>
  /** Success message */
  successMessage?: string
  /** Error message */
  errorMessage?: string
  /** Callback after successful save */
  onSuccess?: (data: T) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Validate before save */
  validate?: (data: T) => string | null
}

interface UseInlineEditReturn<T> {
  /** Whether currently in edit mode */
  isEditing: boolean
  /** Whether save is in progress */
  saving: boolean
  /** Current edit data */
  editData: T
  /** Error message if any */
  error: string | null
  /** Start editing */
  startEditing: () => void
  /** Cancel editing and reset to initial data */
  cancel: () => void
  /** Update a single field */
  setField: <K extends keyof T>(field: K, value: T[K]) => void
  /** Update entire edit data */
  setEditData: React.Dispatch<React.SetStateAction<T>>
  /** Handle input change event */
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void
  /** Save the changes */
  handleSave: () => Promise<boolean>
  /** Form submit handler (prevents default and calls handleSave) */
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  /** Reset edit data to initial */
  reset: () => void
  /** Check if data has changed */
  hasChanges: boolean
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing inline editing state
 */
export function useInlineEdit<T extends Record<string, unknown>>(
  options: UseInlineEditOptions<T>
): UseInlineEditReturn<T> {
  const {
    initialData,
    onSave,
    successMessage = "Changes saved",
    errorMessage = "Failed to save changes",
    onSuccess,
    onError,
    validate,
  } = options

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<T>(initialData)
  const [error, setError] = useState<string | null>(null)

  // Keep track of original data to detect changes
  const originalDataRef = useRef<T>(initialData)

  const startEditing = useCallback(() => {
    originalDataRef.current = initialData
    setEditData(initialData)
    setError(null)
    setIsEditing(true)
  }, [initialData])

  const cancel = useCallback(() => {
    setEditData(originalDataRef.current)
    setError(null)
    setIsEditing(false)
  }, [])

  const reset = useCallback(() => {
    setEditData(initialData)
    setError(null)
  }, [initialData])

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setEditData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const { name, value, type } = e.target
      const newValue =
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value

      setEditData((prev) => ({
        ...prev,
        [name]: newValue,
      }))
      setError(null)
    },
    []
  )

  const handleSave = useCallback(async (): Promise<boolean> => {
    // Validate if validator provided
    if (validate) {
      const validationError = validate(editData)
      if (validationError) {
        setError(validationError)
        toast.error(validationError)
        return false
      }
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(editData)
      toast.success(successMessage)
      originalDataRef.current = editData
      setIsEditing(false)
      onSuccess?.(editData)
      return true
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      const message = errorObj.message || errorMessage
      setError(message)
      toast.error(message)
      onError?.(errorObj)
      return false
    } finally {
      setSaving(false)
    }
  }, [editData, validate, onSave, successMessage, errorMessage, onSuccess, onError])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }
      await handleSave()
    },
    [handleSave]
  )

  // Check if data has changed
  const hasChanges = JSON.stringify(editData) !== JSON.stringify(originalDataRef.current)

  return {
    isEditing,
    saving,
    editData,
    error,
    startEditing,
    cancel,
    setField,
    setEditData,
    handleChange,
    handleSave,
    handleSubmit,
    reset,
    hasChanges,
  }
}

// ============================================================================
// FIELD-LEVEL INLINE EDIT
// ============================================================================

interface UseFieldEditOptions<T> {
  /** Initial value */
  initialValue: T
  /** Save handler */
  onSave: (value: T) => Promise<void>
  /** Success message */
  successMessage?: string
  /** Error message */
  errorMessage?: string
}

interface UseFieldEditReturn<T> {
  isEditing: boolean
  saving: boolean
  value: T
  error: string | null
  startEditing: () => void
  cancel: () => void
  setValue: (value: T) => void
  handleSave: () => Promise<boolean>
}

/**
 * Simplified hook for editing a single field inline
 *
 * @example
 * const statusEdit = useFieldEdit({
 *   initialValue: complaint.status,
 *   onSave: async (status) => {
 *     await updateStatus(complaint.id, status)
 *   },
 * })
 */
export function useFieldEdit<T>(
  options: UseFieldEditOptions<T>
): UseFieldEditReturn<T> {
  const {
    initialValue,
    onSave,
    successMessage = "Saved",
    errorMessage = "Failed to save",
  } = options

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState<T>(initialValue)
  const [error, setError] = useState<string | null>(null)
  const originalValueRef = useRef<T>(initialValue)

  const startEditing = useCallback(() => {
    originalValueRef.current = initialValue
    setValue(initialValue)
    setError(null)
    setIsEditing(true)
  }, [initialValue])

  const cancel = useCallback(() => {
    setValue(originalValueRef.current)
    setError(null)
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      await onSave(value)
      toast.success(successMessage)
      setIsEditing(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage
      setError(message)
      toast.error(message)
      return false
    } finally {
      setSaving(false)
    }
  }, [value, onSave, successMessage, errorMessage])

  return {
    isEditing,
    saving,
    value,
    error,
    startEditing,
    cancel,
    setValue,
    handleSave,
  }
}
