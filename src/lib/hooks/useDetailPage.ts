/**
 * useDetailPage Hook
 *
 * Centralized hook for all detail pages. Replaces duplicated code patterns across 15+ pages.
 * Handles: data fetching, joins transformation, related queries, CRUD operations.
 *
 * @example
 * const { data, related, loading, deleteRecord, refetch } = useDetailPage({
 *   config: STAFF_DETAIL_CONFIG,
 *   id: params.id,
 * })
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { toast } from "sonner"

// ============================================
// Types
// ============================================

export interface RelatedQueryConfig {
  key: string // Result key name
  table: string // Table to query
  select: string // Fields to select
  foreignKey: string // FK column (e.g., "tenant_id")
  foreignKeyValue?: string // Value to use for FK (defaults to entity id, use "field:columnName" to reference a field from main entity)
  joinFields?: string[] // Fields to transform in related data
  orderBy?: string
  orderDirection?: "asc" | "desc"
  limit?: number
  filter?: Record<string, unknown> // Additional filters
  filterNull?: string // Filter where this column is null (e.g., "end_date" for active assignments)
}

export interface DetailPageConfig<T = unknown> {
  table: string
  select: string // Supabase select with joins
  joinFields?: string[] // Fields to transform
  relatedQueries?: RelatedQueryConfig[] // Additional parallel fetches
  computedFields?: (item: T) => Record<string, unknown>
  redirectOnNotFound?: string // Where to redirect if not found
  notFoundMessage?: string // Toast message when not found
}

export interface UseDetailPageOptions<T> {
  config: DetailPageConfig<T>
  id: string | string[] | undefined
  enabled?: boolean
}

export interface UseDetailPageReturn<T> {
  // Data
  data: T | null
  related: Record<string, unknown[]>
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>

  // Actions
  updateField: (field: string, value: unknown) => Promise<boolean>
  updateFields: (updates: Record<string, unknown>) => Promise<boolean>
  deleteRecord: (options?: { confirm?: boolean; cascadeDeletes?: { table: string; foreignKey: string }[] }) => Promise<boolean>
  isDeleting: boolean
  isSaving: boolean
}

// ============================================
// Hook Implementation
// ============================================

export function useDetailPage<T extends object>(
  options: UseDetailPageOptions<T>
): UseDetailPageReturn<T> {
  const { config, id, enabled = true } = options

  const router = useRouter()
  const [data, setData] = useState<T | null>(null)
  const [related, setRelated] = useState<Record<string, unknown[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Refs to prevent stale closures
  const configRef = useRef(config)
  const initialFetchDone = useRef(false)

  // Update ref when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Main fetch function
  const fetchData = useCallback(async () => {
    if (!enabled || !id) {
      setLoading(false)
      return
    }

    const currentConfig = configRef.current
    const entityId = Array.isArray(id) ? id[0] : id
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build main entity query
      const { data: rawData, error: fetchError } = await supabase
        .from(currentConfig.table)
        .select(currentConfig.select)
        .eq("id", entityId)
        .single()

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // Not found
          toast.error(currentConfig.notFoundMessage || `${currentConfig.table.slice(0, -1)} not found`)
          if (currentConfig.redirectOnNotFound) {
            router.push(currentConfig.redirectOnNotFound)
          }
          setData(null)
          setLoading(false)
          return
        }
        throw fetchError
      }

      // Transform join fields
      let transformedData: Record<string, unknown> = { ...rawData }
      if (currentConfig.joinFields && currentConfig.joinFields.length > 0) {
        for (const field of currentConfig.joinFields) {
          if (transformedData[field] !== undefined) {
            transformedData[field] = transformJoin(transformedData[field])
          }
        }
      }

      // Apply computed fields
      if (currentConfig.computedFields) {
        transformedData = {
          ...transformedData,
          ...currentConfig.computedFields(transformedData as unknown as T),
        }
      }

      setData(transformedData as unknown as T)

      // Fetch related data in parallel
      if (currentConfig.relatedQueries && currentConfig.relatedQueries.length > 0) {
        const relatedResults: Record<string, unknown[]> = {}

        const relatedPromises = currentConfig.relatedQueries.map(async (relatedConfig) => {
          try {
            // Determine the FK value
            let fkValue = entityId
            if (relatedConfig.foreignKeyValue) {
              if (relatedConfig.foreignKeyValue.startsWith("field:")) {
                const fieldName = relatedConfig.foreignKeyValue.slice(6)
                const fieldValue = transformedData[fieldName]
                if (!fieldValue) {
                  relatedResults[relatedConfig.key] = []
                  return
                }
                fkValue = fieldValue as string
              } else {
                fkValue = relatedConfig.foreignKeyValue
              }
            }

            let query = supabase
              .from(relatedConfig.table)
              .select(relatedConfig.select)
              .eq(relatedConfig.foreignKey, fkValue)

            // Apply additional filters
            if (relatedConfig.filter) {
              for (const [key, value] of Object.entries(relatedConfig.filter)) {
                if (Array.isArray(value)) {
                  query = query.in(key, value)
                } else {
                  query = query.eq(key, value)
                }
              }
            }

            // Apply null filter
            if (relatedConfig.filterNull) {
              query = query.is(relatedConfig.filterNull, null)
            }

            // Apply ordering
            if (relatedConfig.orderBy) {
              query = query.order(relatedConfig.orderBy, {
                ascending: relatedConfig.orderDirection !== "desc",
              })
            }

            // Apply limit
            if (relatedConfig.limit) {
              query = query.limit(relatedConfig.limit)
            }

            const { data: relatedData, error: relatedError } = await query

            if (relatedError) {
              console.error(`[useDetailPage] Error fetching ${relatedConfig.key}:`, relatedError)
              relatedResults[relatedConfig.key] = []
              return
            }

            // Transform join fields in related data
            let transformedRelated = relatedData || []
            if (relatedConfig.joinFields && relatedConfig.joinFields.length > 0) {
              transformedRelated = transformedRelated.map((item: Record<string, unknown>) => {
                const transformed = { ...item }
                for (const field of relatedConfig.joinFields!) {
                  if (transformed[field] !== undefined) {
                    transformed[field] = transformJoin(transformed[field])
                  }
                }
                return transformed
              })
            }

            relatedResults[relatedConfig.key] = transformedRelated
          } catch (err) {
            console.error(`[useDetailPage] Error fetching ${relatedConfig.key}:`, err)
            relatedResults[relatedConfig.key] = []
          }
        })

        await Promise.all(relatedPromises)
        setRelated(relatedResults)
      }
    } catch (err) {
      console.error(`[useDetailPage] Error fetching ${currentConfig.table}:`, err)
      setError(err as Error)
      toast.error(`Failed to load data`)
    } finally {
      setLoading(false)
    }
  }, [enabled, id, router])

  // Initial fetch
  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true
    fetchData()
  }, [fetchData])

  // Refetch when id changes
  useEffect(() => {
    if (initialFetchDone.current && id) {
      fetchData()
    }
  }, [id, fetchData])

  // Update single field
  const updateField = useCallback(
    async (field: string, value: unknown): Promise<boolean> => {
      if (!data || !id) return false

      const currentConfig = configRef.current
      const entityId = Array.isArray(id) ? id[0] : id
      setIsSaving(true)

      try {
        const supabase = createClient()

        const { error: updateError } = await supabase
          .from(currentConfig.table)
          .update({ [field]: value })
          .eq("id", entityId)

        if (updateError) {
          throw updateError
        }

        // Update local state optimistically
        setData((prev) => (prev ? { ...prev, [field]: value } : null))
        toast.success("Updated successfully")
        return true
      } catch (err) {
        console.error(`[useDetailPage] Error updating ${field}:`, err)
        toast.error("Failed to update")
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [data, id]
  )

  // Update multiple fields
  const updateFields = useCallback(
    async (updates: Record<string, unknown>): Promise<boolean> => {
      if (!data || !id) return false

      const currentConfig = configRef.current
      const entityId = Array.isArray(id) ? id[0] : id
      setIsSaving(true)

      try {
        const supabase = createClient()

        const { error: updateError } = await supabase
          .from(currentConfig.table)
          .update(updates)
          .eq("id", entityId)

        if (updateError) {
          throw updateError
        }

        // Update local state optimistically
        setData((prev) => (prev ? { ...prev, ...updates } : null))
        toast.success("Updated successfully")
        return true
      } catch (err) {
        console.error(`[useDetailPage] Error updating fields:`, err)
        toast.error("Failed to update")
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [data, id]
  )

  // Delete record
  const deleteRecord = useCallback(
    async (options?: {
      confirm?: boolean
      cascadeDeletes?: { table: string; foreignKey: string }[]
    }): Promise<boolean> => {
      if (!data || !id) return false

      const { confirm = true, cascadeDeletes = [] } = options || {}
      const currentConfig = configRef.current
      const entityId = Array.isArray(id) ? id[0] : id

      // Show confirmation if needed
      if (confirm) {
        const confirmed = window.confirm(
          "Are you sure you want to delete this item? This action cannot be undone."
        )
        if (!confirmed) return false
      }

      setIsDeleting(true)

      try {
        const supabase = createClient()

        // Delete cascade records first
        for (const cascade of cascadeDeletes) {
          await supabase.from(cascade.table).delete().eq(cascade.foreignKey, entityId)
        }

        // Delete main record
        const { error: deleteError } = await supabase
          .from(currentConfig.table)
          .delete()
          .eq("id", entityId)

        if (deleteError) {
          throw deleteError
        }

        toast.success("Deleted successfully")

        // Redirect after deletion
        if (currentConfig.redirectOnNotFound) {
          router.push(currentConfig.redirectOnNotFound)
        }

        return true
      } catch (err) {
        console.error(`[useDetailPage] Error deleting:`, err)
        toast.error("Failed to delete")
        return false
      } finally {
        setIsDeleting(false)
      }
    },
    [data, id, router]
  )

  return {
    data,
    related,
    loading,
    error,
    refetch: fetchData,
    updateField,
    updateFields,
    deleteRecord,
    isDeleting,
    isSaving,
  }
}

// ============================================
// Pre-built Configurations
// ============================================

// Staff Detail Config
export const STAFF_DETAIL_CONFIG: DetailPageConfig = {
  table: "staff_members",
  select: `
    *,
    person:people(id, photo_url)
  `,
  joinFields: ["person"],
  redirectOnNotFound: "/staff",
  notFoundMessage: "Staff member not found",
  relatedQueries: [
    {
      key: "userRoles",
      table: "user_roles",
      select: `
        id,
        role_id,
        property_id,
        role:roles(id, name, description),
        property:properties(id, name)
      `,
      foreignKey: "staff_member_id",
      joinFields: ["role", "property"],
    },
  ],
}

// Visitor Detail Config
export const VISITOR_DETAIL_CONFIG: DetailPageConfig = {
  table: "visitors",
  select: `
    *,
    property:properties(id, name),
    tenant:tenants(id, name, phone),
    visitor_contact:visitor_contacts(
      id, name, phone, email, visitor_type, company_name, service_type,
      id_type, id_number, notes, photo_url, is_frequent, is_blocked,
      blocked_reason, visit_count, last_visit_at, person_id,
      person:people(id, photo_url)
    )
  `,
  joinFields: ["property", "tenant", "visitor_contact"],
  redirectOnNotFound: "/visitors",
  notFoundMessage: "Visitor not found",
}

// Tenant Detail Config
export const TENANT_DETAIL_CONFIG: DetailPageConfig = {
  table: "tenants",
  select: `
    *,
    property:properties(id, name, address),
    room:rooms(id, room_number, room_type),
    person:people(
      id, name, phone, email, photo_url, date_of_birth, gender,
      aadhaar_number, pan_number, permanent_address, permanent_city,
      permanent_state, permanent_pincode, current_address, occupation,
      company_name, emergency_contacts, blood_group, is_verified, is_blocked
    )
  `,
  joinFields: ["property", "room", "person"],
  redirectOnNotFound: "/tenants",
  notFoundMessage: "Tenant not found",
  relatedQueries: [
    {
      key: "payments",
      table: "payments",
      select: "id, amount, payment_date, payment_method, for_period, charge_type:charge_types(name)",
      foreignKey: "tenant_id",
      joinFields: ["charge_type"],
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "charges",
      table: "charges",
      select: "id, amount, due_date, status, for_period, charge_type:charge_types(name)",
      foreignKey: "tenant_id",
      joinFields: ["charge_type"],
      filter: { status: ["pending", "partial", "overdue"] },
      orderBy: "due_date",
      orderDirection: "asc",
    },
    {
      key: "stays",
      table: "tenant_stays",
      select: "id, join_date, exit_date, monthly_rent, status, stay_number, property:properties(name), room:rooms(room_number)",
      foreignKey: "tenant_id",
      joinFields: ["property", "room"],
      orderBy: "stay_number",
      orderDirection: "desc",
    },
    {
      key: "transfers",
      table: "room_transfers",
      select: `
        id, transfer_date, reason, old_rent, new_rent,
        from_property:properties!room_transfers_from_property_id_fkey(name),
        from_room:rooms!room_transfers_from_room_id_fkey(room_number),
        to_property:properties!room_transfers_to_property_id_fkey(name),
        to_room:rooms!room_transfers_to_room_id_fkey(room_number)
      `,
      foreignKey: "tenant_id",
      joinFields: ["from_property", "from_room", "to_property", "to_room"],
      orderBy: "transfer_date",
      orderDirection: "desc",
    },
    {
      key: "bills",
      table: "bills",
      select: "id, bill_number, bill_date, total_amount, balance_due, status",
      foreignKey: "tenant_id",
      orderBy: "bill_date",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Bill Detail Config
export const BILL_DETAIL_CONFIG: DetailPageConfig = {
  table: "bills",
  select: `
    *,
    tenant:tenants(id, name, phone, email, person_id, person:people(id, photo_url)),
    property:properties(id, name, address)
  `,
  joinFields: ["tenant", "property"],
  redirectOnNotFound: "/bills",
  notFoundMessage: "Bill not found",
  relatedQueries: [
    {
      key: "payments",
      table: "payments",
      select: "id, amount, payment_date, payment_method, receipt_number, notes",
      foreignKey: "bill_id",
      orderBy: "payment_date",
      orderDirection: "desc",
    },
  ],
}

// Payment Detail Config
export const PAYMENT_DETAIL_CONFIG: DetailPageConfig = {
  table: "payments",
  select: `
    *,
    tenant:tenants(id, name, phone, person_id, person:people(id, photo_url)),
    property:properties(id, name),
    bill:bills(id, bill_number, total_amount, balance_due),
    charge_type:charge_types(id, name)
  `,
  joinFields: ["tenant", "property", "bill", "charge_type"],
  redirectOnNotFound: "/payments",
  notFoundMessage: "Payment not found",
}

// Expense Detail Config
export const EXPENSE_DETAIL_CONFIG: DetailPageConfig = {
  table: "expenses",
  select: `
    *,
    property:properties(id, name),
    expense_type:expense_types(id, name, code)
  `,
  joinFields: ["property", "expense_type"],
  redirectOnNotFound: "/expenses",
  notFoundMessage: "Expense not found",
}

// Property Detail Config
export const PROPERTY_DETAIL_CONFIG: DetailPageConfig = {
  table: "properties",
  select: "*",
  redirectOnNotFound: "/properties",
  notFoundMessage: "Property not found",
  relatedQueries: [
    {
      key: "rooms",
      table: "rooms",
      select: "id, room_number, room_type, floor, total_beds, occupied_beds, rent_amount, status, has_ac, has_attached_bathroom",
      foreignKey: "property_id",
      orderBy: "room_number",
      orderDirection: "asc",
    },
    {
      key: "tenants",
      table: "tenants",
      select: "id, name, phone, photo_url, profile_photo, status, monthly_rent, check_in_date, room:rooms(id, room_number), person:people(id, photo_url)",
      foreignKey: "property_id",
      joinFields: ["room", "person"],
      filter: { status: ["active", "notice_period"] },
      orderBy: "name",
      orderDirection: "asc",
    },
    {
      key: "staff",
      table: "user_roles",
      select: "id, staff_member:staff_members(id, name, email, phone, is_active, person:people(id, photo_url)), role:roles(id, name)",
      foreignKey: "property_id",
      joinFields: ["staff_member", "role"],
    },
    {
      key: "bills",
      table: "bills",
      select: "id, bill_number, bill_date, total_amount, balance_due, status, tenant:tenants(id, name)",
      foreignKey: "property_id",
      joinFields: ["tenant"],
      orderBy: "bill_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "payments",
      table: "payments",
      select: "id, amount, payment_date, payment_method, tenant:tenants(id, name)",
      foreignKey: "property_id",
      joinFields: ["tenant"],
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "expenses",
      table: "expenses",
      select: "id, amount, expense_date, description, expense_type:expense_types(name)",
      foreignKey: "property_id",
      joinFields: ["expense_type"],
      orderBy: "expense_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "complaints",
      table: "complaints",
      select: "id, title, description, status, priority, created_at, tenant:tenants(id, name), room:rooms(id, room_number)",
      foreignKey: "property_id",
      joinFields: ["tenant", "room"],
      orderBy: "created_at",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "visitors",
      table: "visitors",
      select: "id, visitor_name, purpose, check_in_time, check_out_time, is_overnight, tenant:tenants(id, name)",
      foreignKey: "property_id",
      joinFields: ["tenant"],
      orderBy: "check_in_time",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Room Detail Config
export const ROOM_DETAIL_CONFIG: DetailPageConfig = {
  table: "rooms",
  select: `
    *,
    property:properties(id, name, address)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/rooms",
  notFoundMessage: "Room not found",
  relatedQueries: [
    {
      key: "tenants",
      table: "tenants",
      select: "id, name, phone, email, photo_url, profile_photo, status, monthly_rent, check_in_date, person:people(id, photo_url)",
      foreignKey: "room_id",
      joinFields: ["person"],
      filter: { status: ["active", "notice_period"] },
      orderBy: "name",
      orderDirection: "asc",
    },
    {
      key: "meterAssignments",
      table: "meter_assignments",
      select: "id, meter_id, start_date, start_reading, end_date, meter:meters(id, meter_number, meter_type, status)",
      foreignKey: "room_id",
      joinFields: ["meter"],
      filterNull: "end_date",
      orderBy: "start_date",
      orderDirection: "desc",
    },
    {
      key: "meterReadings",
      table: "meter_readings",
      select: "id, reading_date, reading_value, units_consumed, meter:meters(id, meter_number, meter_type)",
      foreignKey: "room_id",
      joinFields: ["meter"],
      orderBy: "reading_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "complaints",
      table: "complaints",
      select: "id, title, description, status, priority, created_at, tenant:tenants(id, name)",
      foreignKey: "room_id",
      joinFields: ["tenant"],
      orderBy: "created_at",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Meter Reading Detail Config
export const METER_READING_DETAIL_CONFIG: DetailPageConfig = {
  table: "meter_readings",
  select: `
    *,
    property:properties(id, name, address),
    room:rooms(id, room_number),
    charge_type:charge_types(id, name, calculation_config)
  `,
  joinFields: ["property", "room", "charge_type"],
  redirectOnNotFound: "/meter-readings",
  notFoundMessage: "Meter reading not found",
}

// Meter Detail Config
export const METER_DETAIL_CONFIG: DetailPageConfig = {
  table: "meters",
  select: `
    *,
    property:properties(id, name)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/meters",
  notFoundMessage: "Meter not found",
  relatedQueries: [
    {
      key: "assignments",
      table: "meter_assignments",
      select: "id, start_date, end_date, start_reading, end_reading, reason, notes, room:rooms(id, room_number)",
      foreignKey: "meter_id",
      joinFields: ["room"],
      orderBy: "start_date",
      orderDirection: "desc",
    },
    {
      key: "readings",
      table: "meter_readings",
      select: "id, reading_date, reading_value, units_consumed",
      foreignKey: "meter_id",
      orderBy: "reading_date",
      orderDirection: "desc",
      limit: 10,
    },
    {
      key: "rooms",
      table: "rooms",
      select: "id, room_number",
      foreignKey: "property_id",
      foreignKeyValue: "field:property_id",
      orderBy: "room_number",
      orderDirection: "asc",
    },
  ],
}

// Complaint Detail Config
export const COMPLAINT_DETAIL_CONFIG: DetailPageConfig = {
  table: "complaints",
  select: `
    *,
    tenant:tenants(id, name, phone, person:people(id, photo_url)),
    property:properties(id, name, address, city),
    room:rooms(id, room_number)
  `,
  joinFields: ["tenant", "property", "room"],
  redirectOnNotFound: "/complaints",
  notFoundMessage: "Complaint not found",
}

// Notice Detail Config
export const NOTICE_DETAIL_CONFIG: DetailPageConfig = {
  table: "notices",
  select: `
    *,
    property:properties(id, name)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/notices",
  notFoundMessage: "Notice not found",
}

// Exit Clearance Detail Config
export const EXIT_CLEARANCE_DETAIL_CONFIG: DetailPageConfig = {
  table: "exit_clearance",
  select: `
    *,
    tenant:tenants(id, name, phone, email, security_deposit, monthly_rent, person:people(id, photo_url)),
    property:properties(id, name),
    room:rooms(id, room_number)
  `,
  joinFields: ["tenant", "property", "room"],
  redirectOnNotFound: "/exit-clearance",
  notFoundMessage: "Exit clearance not found",
  relatedQueries: [
    {
      key: "refunds",
      table: "refunds",
      select: "id, amount, refund_type, status, payment_method, processed_date",
      foreignKey: "exit_clearance_id",
      orderBy: "created_at",
      orderDirection: "desc",
    },
  ],
}

// Refund Detail Config
export const REFUND_DETAIL_CONFIG: DetailPageConfig = {
  table: "refunds",
  select: `
    *,
    tenant:tenants(id, name, phone, photo_url, profile_photo, person:people(id, photo_url)),
    property:properties(id, name),
    exit_clearance:exit_clearance(id, expected_exit_date, actual_exit_date, settlement_status)
  `,
  joinFields: ["tenant", "property", "exit_clearance"],
  redirectOnNotFound: "/refunds",
  notFoundMessage: "Refund not found",
}

// People Detail Config
export const PEOPLE_DETAIL_CONFIG: DetailPageConfig = {
  table: "people",
  select: "*",
  redirectOnNotFound: "/people",
  notFoundMessage: "Person not found",
  relatedQueries: [
    {
      key: "tenants",
      table: "tenants",
      select: "id, check_in_date, check_out_date, status, monthly_rent, property:properties(name), room:rooms(room_number)",
      foreignKey: "person_id",
      joinFields: ["property", "room"],
      orderBy: "check_in_date",
      orderDirection: "desc",
    },
    {
      key: "staffMembers",
      table: "staff_members",
      select: "id, is_active, created_at, user_id",
      foreignKey: "person_id",
      orderBy: "created_at",
      orderDirection: "desc",
    },
    {
      key: "visitorContacts",
      table: "visitor_contacts",
      select: "id, visit_count, is_frequent, is_blocked",
      foreignKey: "person_id",
    },
  ],
}
