/**
 * useDetailPage Hook
 *
 * Centralized hook for all detail pages. Replaces duplicated code patterns across 15+ pages.
 * Handles: data fetching, joins transformation, related queries, CRUD operations.
 *
 * Implementation is split into focused sub-hooks:
 * - detail-page/types.ts - All shared types/interfaces and pre-built configs
 * - detail-page/useDetailPageData.ts - Data fetching, join transforms, related data loading, refresh
 * - detail-page/useDetailPageMutations.ts - Update, delete (soft delete), cascade delete operations
 *
 * @example
 * const { data, related, loading, deleteRecord, refetch } = useDetailPage({
 *   config: STAFF_DETAIL_CONFIG,
 *   id: params.id,
 * })
 */

"use client"

import { useDetailPageData } from "./detail-page/useDetailPageData"
import { useDetailPageMutations } from "./detail-page/useDetailPageMutations"
import type { UseDetailPageOptions, UseDetailPageReturn } from "./detail-page/types"

// Re-export all types and configs for backward compatibility
export type {
  RelatedQueryConfig,
  DetailPageConfig,
  UseDetailPageOptions,
  UseDetailPageReturn,
} from "./detail-page/types"

export {
  // PG Module Configs
  STAFF_DETAIL_CONFIG,
  VISITOR_DETAIL_CONFIG,
  TENANT_DETAIL_CONFIG,
  BILL_DETAIL_CONFIG,
  PAYMENT_DETAIL_CONFIG,
  EXPENSE_DETAIL_CONFIG,
  PROPERTY_DETAIL_CONFIG,
  ROOM_DETAIL_CONFIG,
  METER_READING_DETAIL_CONFIG,
  METER_DETAIL_CONFIG,
  COMPLAINT_DETAIL_CONFIG,
  NOTICE_DETAIL_CONFIG,
  EXIT_CLEARANCE_DETAIL_CONFIG,
  REFUND_DETAIL_CONFIG,
  PEOPLE_DETAIL_CONFIG,
  INQUIRY_DETAIL_CONFIG,
  // Enhanced Expense Module Configs
  PRODUCT_DETAIL_CONFIG,
  DAILY_SPEND_DETAIL_CONFIG,
  VENDOR_DETAIL_CONFIG,
  BILL_PAYMENT_DETAIL_CONFIG,
  SERVICE_PROVIDER_DETAIL_CONFIG,
  SERVICE_PAYMENT_DETAIL_CONFIG,
  KITCHEN_WASTAGE_DETAIL_CONFIG,
  MISC_TRANSACTION_DETAIL_CONFIG,
  // Library Module Configs
  LIBRARY_DETAIL_CONFIG,
  LIBRARY_SECTION_DETAIL_CONFIG,
  LIBRARY_SEAT_DETAIL_CONFIG,
  LIBRARY_MEMBER_DETAIL_CONFIG,
  LIBRARY_ATTENDANCE_DETAIL_CONFIG,
  LIBRARY_LOCKER_DETAIL_CONFIG,
  LIBRARY_SUBSCRIPTION_DETAIL_CONFIG,
  LIBRARY_PAYMENT_DETAIL_CONFIG,
  BUSINESS_DETAIL_CONFIG,
  ENTITY_DETAIL_CONFIG,
} from "./detail-page/types"

// ============================================
// Hook Implementation
// ============================================

export function useDetailPage<T extends object>(
  options: UseDetailPageOptions<T>
): UseDetailPageReturn<T> {
  const { config, id, enabled = true } = options

  // Data fetching, join transforms, related data loading, refresh
  const { data, setData, related, loading, error, refetch } = useDetailPageData<T>({
    config,
    id,
    enabled,
  })

  // Update, delete (soft delete), cascade delete operations
  const { updateField, updateFields, deleteRecord, isDeleting, isSaving } =
    useDetailPageMutations<T>({
      config,
      id,
      data,
      setData,
    })

  return {
    data,
    related,
    loading,
    error,
    refetch,
    updateField,
    updateFields,
    deleteRecord,
    isDeleting,
    isSaving,
  }
}
