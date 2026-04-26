/**
 * useFormPage Hook
 *
 * Eliminates boilerplate across 20+ form pages (new/edit).
 * Provides unified form state, change handlers, auth context,
 * URL pre-selection, and Supabase insert/update with audit tracking.
 *
 * @example (New Page)
 * ```typescript
 * const {
 *   formData, setFormData,
 *   handleChange, handleSubmit,
 *   loading, saving,
 *   user, ownerId,
 * } = useFormPage({
 *   table: "library_plans",
 *   initialData: { name: "", base_price: "" },
 *   redirectTo: "/library-plans",
 *   transform: (data, userId) => ({
 *     name: data.name,
 *     base_price: Number(data.base_price),
 *   }),
 * })
 * ```
 *
 * @example (Edit Page)
 * ```typescript
 * const {
 *   formData, setFormData,
 *   handleChange, handleSubmit,
 *   loading, saving,
 * } = useFormEditPage({
 *   table: "rooms",
 *   id: params.id as string,
 *   select: "*",
 *   redirectTo: `/rooms/${params.id}`,
 *   mapToForm: (record) => ({
 *     room_number: record.room_number,
 *     rent_amount: record.rent_amount.toString(),
 *   }),
 *   transform: (data) => ({
 *     room_number: data.room_number,
 *     rent_amount: parseFloat(data.rent_amount),
 *   }),
 * })
 * ```
 */

"use client"

import { useState, useCallback, useEffect, useRef, ChangeEvent, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { useUnsavedChanges } from "./useUnsavedChanges"
import { useFormValidation, type ValidationSchema } from "./useFormValidation"

// ============================================================================
// TYPES
// ============================================================================

type FormValue = string | number | boolean | null | undefined | string[] | Record<string, unknown>

type FormData = Record<string, FormValue>

export interface UseFormPageOptions<T extends FormData> {
  /** Supabase table to insert into */
  table: string
  /** Initial form data (used before any pre-fill) */
  initialData: T
  /** URL to redirect to after successful submission */
  redirectTo: string
  /**
   * URL search param keys to pre-fill into formData.
   * For example, `["library_id", "tenant_id"]` will read
   * `?library_id=xxx&tenant_id=yyy` and set those fields.
   */
  preSelectFields?: string[]
  /**
   * Transform form data before inserting into the database.
   * Receives the form data and the authenticated user's ID.
   * Should return the exact object to insert (before withCreatedBy wrapping).
   *
   * If not provided, the raw formData is used.
   */
  transform?: (data: T, userId: string) => Record<string, unknown>
  /**
   * Success message shown after creation.
   * Defaults to "Created successfully".
   */
  successMessage?: string
  /**
   * Error message prefix shown on failure.
   * Defaults to "Failed to create".
   */
  errorMessage?: string
  /**
   * Whether to wrap the insert data with `withCreatedBy()`.
   * Defaults to true.
   */
  useCreatedBy?: boolean
  /**
   * Whether to add `owner_id: user.id` automatically.
   * Defaults to true.
   */
  addOwnerId?: boolean
  /**
   * Optional callback for custom validation before submit.
   * Return a string error message to abort, or null/undefined to proceed.
   */
  validate?: (data: T) => string | null | undefined
  /**
   * Field-level validation schema. When provided, enables inline error
   * display via the `errors` return value. Validated on submit and
   * optionally on blur via `validateField`.
   *
   * @example
   * validationSchema: {
   *   name: (v) => !String(v).trim() ? { isValid: false, error: "Name is required" } : null,
   *   amount: (v) => validatePositiveAmount(v, "Amount"),
   * }
   */
  validationSchema?: ValidationSchema<T>
  /**
   * Optional callback invoked after a successful insert.
   * Receives the inserted data (if .select() was used) and user ID.
   * Return a redirect URL to override the default, or void/undefined for default.
   */
  onSuccess?: (data: Record<string, unknown> | null, userId: string) => string | void
  /**
   * Optional custom submit handler. When provided, replaces the default
   * insert logic entirely. Useful for pages with workflows or multi-table inserts.
   * Must throw on error (will be caught and shown as toast).
   */
  customSubmit?: (data: T, userId: string, supabase: ReturnType<typeof createClient>) => Promise<string | void>
  /**
   * Whether to select the inserted row back.
   * If true, the inserted record is returned from supabase.
   * Defaults to false.
   */
  selectAfterInsert?: boolean
}

export interface UseFormPageReturn<T extends FormData> {
  /** Current form data state */
  formData: T
  /** React state setter for form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>
  /**
   * Generic change handler for text/select/textarea inputs.
   * Handles checkboxes via type detection.
   */
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  /**
   * Programmatically set a single form field.
   */
  setField: <K extends keyof T>(name: K, value: T[K]) => void
  /**
   * Programmatically set multiple form fields at once.
   */
  setFields: (fields: Partial<T>) => void
  /**
   * Submit handler to wire to `<form onSubmit={handleSubmit}>`.
   * Handles auth check, validation, transform, insert, toast, and redirect.
   */
  handleSubmit: (e: React.FormEvent) => Promise<void>
  /** True while initial reference data is loading (set via setLoading) */
  loading: boolean
  /** Set the loading state (for initial data fetches in the page) */
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  /** True while the form is being submitted */
  saving: boolean
  /** Whether any form field has been modified from its initial value */
  hasUnsavedChanges: boolean
  /** Current authenticated user (from useAuthContext) */
  user: ReturnType<typeof useAuthContext>["user"]
  /** Shortcut to user.id (owner ID in most cases) */
  ownerId: string
  /** Workspace ID from auth context */
  workspaceId: string | null
  /** The search params object for additional URL param reading */
  searchParams: ReturnType<typeof useSearchParams>
  /** Next.js router for manual navigation */
  router: ReturnType<typeof useRouter>
  /** Field-level validation errors (only populated when validationSchema is provided) */
  errors: Partial<Record<keyof T, string>>
  /** Validate a single field (call on blur). Only works when validationSchema is provided. */
  validateField: (field: keyof T) => boolean
  /** Clear all validation errors */
  clearErrors: () => void
}

// ============================================================================
// HOOK: useFormPage (for "new" pages)
// ============================================================================

export function useFormPage<T extends FormData>(
  options: UseFormPageOptions<T>
): UseFormPageReturn<T> {
  const {
    table,
    initialData,
    redirectTo,
    preSelectFields,
    transform,
    successMessage = "Created successfully",
    errorMessage = "Failed to create",
    useCreatedBy = true,
    addOwnerId = true,
    validate,
    validationSchema,
    onSuccess,
    customSubmit,
    selectAfterInsert = false,
  } = options

  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, workspaceId } = useAuthContext()

  // Compute pre-filled initial data from URL params (only on mount)
  const initialWithPreSelect = useMemo(() => {
    if (!preSelectFields || preSelectFields.length === 0) return initialData

    const prefilled = { ...initialData }
    for (const field of preSelectFields) {
      const value = searchParams.get(field)
      if (value !== null && field in prefilled) {
        (prefilled as Record<string, FormValue>)[field] = value
      }
    }
    return prefilled
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - only compute once on mount

  const [formData, setFormData] = useState<T>(initialWithPreSelect)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const initialDataRef = useRef<T>(initialWithPreSelect)

  const ownerId = user?.id || ""

  // ---- Unsaved Changes Warning ----
  useUnsavedChanges(isDirty)

  // ---- Field-Level Validation ----
  const emptySchema = useMemo(() => ({} as ValidationSchema<T>), [])
  const {
    errors: fieldErrors,
    validateField: validateSingleField,
    validateAll,
    clearErrors,
    clearFieldError,
  } = useFormValidation(validationSchema || emptySchema, formData)

  // ---- Change Handlers ----

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      let processedValue: FormValue

      if (type === "checkbox") {
        processedValue = (e.target as HTMLInputElement).checked
      } else {
        processedValue = value
      }

      setFormData((prev) => {
        const next = { ...prev, [name]: processedValue }
        setIsDirty(JSON.stringify(next) !== JSON.stringify(initialDataRef.current))
        return next
      })

      // Clear field error on change for immediate feedback
      if (validationSchema && name in (validationSchema as Record<string, unknown>)) {
        clearFieldError(name as keyof T)
      }
    },
    [validationSchema, clearFieldError]
  )

  const setField = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      setIsDirty(JSON.stringify(next) !== JSON.stringify(initialDataRef.current))
      return next
    })
  }, [])

  const setFields = useCallback((fields: Partial<T>) => {
    setFormData((prev) => {
      const next = { ...prev, ...fields }
      setIsDirty(JSON.stringify(next) !== JSON.stringify(initialDataRef.current))
      return next
    })
  }, [])

  // ---- Submit Handler ----

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (saving) return

      // Auth check
      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Field-level validation (runs first for inline errors)
      if (validationSchema) {
        const schemaValid = validateAll(formData)
        if (!schemaValid) {
          showError("Please fix the errors in the form")
          return
        }
      }

      // Custom validation (legacy callback)
      if (validate) {
        const validationError = validate(formData)
        if (validationError) {
          showError(validationError)
          return
        }
      }

      setSaving(true)

      try {
        // Custom submit path
        if (customSubmit) {
          const supabase = createClient()
          const customRedirect = await customSubmit(formData, user.id, supabase)
          setIsDirty(false)
          showSuccess(successMessage)
          router.push(customRedirect || redirectTo)
          return
        }

        // Standard insert path
        const supabase = createClient()

        // Build the data to insert
        let insertData: Record<string, unknown>

        if (transform) {
          insertData = transform(formData, user.id)
        } else {
          insertData = { ...formData } as Record<string, unknown>
        }

        // Add owner_id if requested
        if (addOwnerId && !insertData.owner_id) {
          insertData.owner_id = user.id
        }

        // Wrap with created_by audit fields
        if (useCreatedBy) {
          insertData = withCreatedBy(insertData, user.id)
        }

        // Perform the insert
        let _query = supabase.from(table).insert(insertData)

        if (selectAfterInsert) {
          _query = _query.select() as typeof _query
        }

        const { data: insertedData, error } = selectAfterInsert
          ? await supabase.from(table).insert(insertData).select().single()
          : await supabase.from(table).insert(insertData)

        if (error) {
          console.error(`Error inserting into ${table}:`, error)
          showError(`${errorMessage}: ${error.message}`)
          return
        }

        // Call onSuccess callback if provided
        let finalRedirect = redirectTo
        if (onSuccess) {
          const overrideRedirect = onSuccess(
            insertedData as Record<string, unknown> | null,
            user.id
          )
          if (overrideRedirect) {
            finalRedirect = overrideRedirect
          }
        }

        setIsDirty(false)
        showSuccess(successMessage)
        router.push(finalRedirect)
      } catch (error: unknown) {
        handleClientError(error, `Creating ${table.replace(/_/g, " ")}`)
      } finally {
        setSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      user,
      formData,
      table,
      redirectTo,
      transform,
      successMessage,
      errorMessage,
      useCreatedBy,
      addOwnerId,
      validate,
      validationSchema,
      validateAll,
      onSuccess,
      customSubmit,
      selectAfterInsert,
      router,
    ]
  )

  return {
    formData,
    setFormData,
    handleChange,
    setField,
    setFields,
    handleSubmit,
    loading,
    setLoading,
    saving,
    hasUnsavedChanges: isDirty,
    user,
    ownerId,
    workspaceId,
    searchParams,
    router,
    errors: fieldErrors,
    validateField: validateSingleField,
    clearErrors,
  }
}

// ============================================================================
// TYPES: useFormEditPage
// ============================================================================

export interface UseFormEditPageOptions<T extends FormData> {
  /** Supabase table to update */
  table: string
  /** Record ID to fetch and update */
  id: string
  /** Supabase select query (defaults to "*") */
  select?: string
  /** Initial (empty) form data before the record loads */
  initialData: T
  /** URL to redirect to after successful update */
  redirectTo: string
  /**
   * Map the fetched database record to form data.
   * Converts DB types (numbers, etc.) to form-friendly strings.
   */
  mapToForm: (record: Record<string, unknown>) => T
  /**
   * Transform form data before updating in the database.
   * Should return the exact object to pass to `.update()`.
   */
  transform?: (data: T, userId: string) => Record<string, unknown>
  /** Success message (defaults to "Updated successfully") */
  successMessage?: string
  /** Error message prefix (defaults to "Failed to update") */
  errorMessage?: string
  /**
   * Optional callback for custom validation before submit.
   * Return a string error message to abort, or null/undefined to proceed.
   */
  validate?: (data: T) => string | null | undefined
  /** Field-level validation schema (same as useFormPage) */
  validationSchema?: ValidationSchema<T>
  /**
   * Redirect URL when the record is not found.
   * Defaults to redirectTo parent path.
   */
  notFoundRedirect?: string
  /**
   * Optional custom submit handler for edit pages with complex update logic.
   */
  customSubmit?: (data: T, userId: string, recordId: string, supabase: ReturnType<typeof createClient>) => Promise<string | void>
}

export interface UseFormEditPageReturn<T extends FormData> {
  /** Current form data state */
  formData: T
  /** React state setter for form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>
  /** Generic change handler */
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  /** Set a single field */
  setField: <K extends keyof T>(name: K, value: T[K]) => void
  /** Set multiple fields at once */
  setFields: (fields: Partial<T>) => void
  /** Submit handler */
  handleSubmit: (e: React.FormEvent) => Promise<void>
  /** True while the record is being fetched */
  loading: boolean
  /** Set the loading state manually */
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  /** True while the form is being submitted */
  saving: boolean
  /** Whether any form field has been modified from its initial/loaded value */
  hasUnsavedChanges: boolean
  /** Current authenticated user */
  user: ReturnType<typeof useAuthContext>["user"]
  /** Owner ID shortcut */
  ownerId: string
  /** Workspace ID */
  workspaceId: string | null
  /** Next.js router */
  router: ReturnType<typeof useRouter>
  /** The raw record fetched from the database */
  record: Record<string, unknown> | null
  /** Field-level validation errors */
  errors: Partial<Record<keyof T, string>>
  /** Validate a single field (call on blur) */
  validateField: (field: keyof T) => boolean
  /** Clear all validation errors */
  clearErrors: () => void
}

// ============================================================================
// HOOK: useFormEditPage (for edit pages)
// ============================================================================

export function useFormEditPage<T extends FormData>(
  options: UseFormEditPageOptions<T>
): UseFormEditPageReturn<T> {
  const {
    table,
    id,
    select = "*",
    initialData,
    redirectTo,
    mapToForm,
    transform,
    successMessage = "Updated successfully",
    errorMessage = "Failed to update",
    validate,
    validationSchema,
    notFoundRedirect,
    customSubmit,
  } = options

  const router = useRouter()
  const { user, workspaceId } = useAuthContext()

  const [formData, setFormData] = useState<T>(initialData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [record, setRecord] = useState<Record<string, unknown> | null>(null)
  const loadedFormDataRef = useRef<T>(initialData)

  const ownerId = user?.id || ""

  // ---- Unsaved Changes Warning ----
  useUnsavedChanges(isDirty)

  // ---- Field-Level Validation ----
  const emptySchemaEdit = useMemo(() => ({} as ValidationSchema<T>), [])
  const {
    errors: fieldErrors,
    validateField: validateSingleField,
    validateAll,
    clearErrors,
    clearFieldError,
  } = useFormValidation(validationSchema || emptySchemaEdit, formData)

  // ---- Fetch record on mount ----

  useEffect(() => {
    if (!id) return

    const fetchRecord = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq("id", id)
        .single()

      if (error || !data) {
        console.error(`Error fetching ${table} record:`, error)
        showError(`${table.replace(/_/g, " ")} not found`)
        router.push(notFoundRedirect || redirectTo)
        return
      }

      setRecord(data as Record<string, unknown>)
      const mappedData = mapToForm(data as Record<string, unknown>)
      setFormData(mappedData)
      loadedFormDataRef.current = mappedData
      setIsDirty(false)
      setLoading(false)
    }

    fetchRecord()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, table])

  // ---- Change Handlers ----

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      let processedValue: FormValue

      if (type === "checkbox") {
        processedValue = (e.target as HTMLInputElement).checked
      } else {
        processedValue = value
      }

      setFormData((prev) => {
        const next = { ...prev, [name]: processedValue }
        setIsDirty(JSON.stringify(next) !== JSON.stringify(loadedFormDataRef.current))
        return next
      })

      // Clear field error on change
      if (validationSchema && name in (validationSchema as Record<string, unknown>)) {
        clearFieldError(name as keyof T)
      }
    },
    [validationSchema, clearFieldError]
  )

  const setField = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      setIsDirty(JSON.stringify(next) !== JSON.stringify(loadedFormDataRef.current))
      return next
    })
  }, [])

  const setFields = useCallback((fields: Partial<T>) => {
    setFormData((prev) => {
      const next = { ...prev, ...fields }
      setIsDirty(JSON.stringify(next) !== JSON.stringify(loadedFormDataRef.current))
      return next
    })
  }, [])

  // ---- Submit Handler ----

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (saving) return

      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Field-level validation
      if (validationSchema) {
        const schemaValid = validateAll(formData)
        if (!schemaValid) {
          showError("Please fix the errors in the form")
          return
        }
      }

      // Custom validation (legacy callback)
      if (validate) {
        const validationError = validate(formData)
        if (validationError) {
          showError(validationError)
          return
        }
      }

      setSaving(true)

      try {
        const supabase = createClient()

        // Custom submit path
        if (customSubmit) {
          const customRedirect = await customSubmit(formData, user.id, id, supabase)
          setIsDirty(false)
          showSuccess(successMessage)
          router.push(customRedirect || redirectTo)
          return
        }

        // Standard update path
        let updateData: Record<string, unknown>

        if (transform) {
          updateData = transform(formData, user.id)
        } else {
          updateData = { ...formData } as Record<string, unknown>
        }

        const { error } = await supabase
          .from(table)
          .update(updateData)
          .eq("id", id)

        if (error) {
          console.error(`Error updating ${table}:`, error)
          showError(`${errorMessage}: ${error.message}`)
          return
        }

        setIsDirty(false)
        showSuccess(successMessage)
        router.push(redirectTo)
      } catch (error: unknown) {
        handleClientError(error, `Updating ${table.replace(/_/g, " ")}`)
      } finally {
        setSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, formData, table, id, redirectTo, transform, successMessage, errorMessage, validate, validationSchema, validateAll, customSubmit, router]
  )

  return {
    formData,
    setFormData,
    handleChange,
    setField,
    setFields,
    handleSubmit,
    loading,
    setLoading,
    saving,
    hasUnsavedChanges: isDirty,
    user,
    ownerId,
    workspaceId,
    router,
    record,
    errors: fieldErrors,
    validateField: validateSingleField,
    clearErrors,
  }
}
