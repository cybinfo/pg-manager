"use client"

import { RecordMetadataContent } from "./record-metadata"
import { ActivityHistoryContent } from "./activity-history"
import { DetailSection } from "./detail-components"
import { Calendar, History } from "lucide-react"
import type { AuditableEntity } from "@/types/audit.types"

interface DetailPageAuditProps {
  /**
   * The record containing audit fields.
   * Must have at least created_at, and optionally other audit fields.
   */
  record: Partial<AuditableEntity> & { id: string }

  /**
   * The entity type for activity history lookup.
   * This should match the entity_type in audit_events table.
   * Examples: "tenant", "bill", "payment", "expense", etc.
   */
  entityType: string

  /**
   * Optional className for the container
   */
  className?: string

  /**
   * Whether to show the activity history panel.
   * Defaults to true.
   */
  showActivityHistory?: boolean

  /**
   * Maximum number of activity items to show.
   * Defaults to 5.
   */
  maxActivityItems?: number

  /**
   * Layout mode for the audit display.
   * - "grid": Side by side (metadata | activity) - default
   * - "stack": Stacked (metadata above activity)
   * - "compact": Only metadata, no activity
   */
  layout?: "grid" | "stack" | "compact"
}

/**
 * DetailPageAudit - Standardized audit display for detail pages
 *
 * Use this component at the bottom of any detail page to show:
 * - Record metadata (created_at, created_by, deleted status)
 * - Activity history from audit_events
 *
 * Uses DetailSection wrapper for consistent UI with other sections.
 *
 * @example
 * // In a detail page:
 * <DetailPageAudit
 *   record={tenant}
 *   entityType="tenant"
 * />
 *
 * @example
 * // Compact mode for smaller detail views:
 * <DetailPageAudit
 *   record={payment}
 *   entityType="payment"
 *   layout="compact"
 * />
 */
export function DetailPageAudit({
  record,
  entityType,
  className,
  showActivityHistory = true,
  maxActivityItems = 5,
  layout = "grid",
}: DetailPageAuditProps) {
  const metadataContent = (
    <RecordMetadataContent
      record={{
        created_at: record.created_at,
        updated_at: record.updated_at,
        created_by: record.created_by,
        deleted_at: record.deleted_at,
        deleted_by: record.deleted_by,
      }}
    />
  )

  const activityContent = (
    <ActivityHistoryContent
      entityType={entityType}
      entityId={record.id}
      maxItems={maxActivityItems}
    />
  )

  if (layout === "compact") {
    return (
      <DetailSection
        title="Record Information"
        description="Created and updated details"
        icon={Calendar}
        className={className}
      >
        {metadataContent}
      </DetailSection>
    )
  }

  // Stack and grid layouts render as separate DetailSection cards
  return (
    <>
      <DetailSection
        title="Record Information"
        description="Created and updated details"
        icon={Calendar}
        className={className}
      >
        {metadataContent}
      </DetailSection>
      {showActivityHistory && (
        <DetailSection
          title="Activity History"
          description="Recent changes to this record"
          icon={History}
          className={className}
        >
          {activityContent}
        </DetailSection>
      )}
    </>
  )
}

/**
 * Entity type mapping for audit_events table.
 * Use these constants to ensure consistency.
 *
 * For display names (e.g. "Tenant", "Bill"), use getEntityName()
 * from "@/lib/entity-names" instead.
 */
export const AUDIT_ENTITY_TYPES = {
  tenant: "tenant",
  bill: "bill",
  payment: "payment",
  expense: "expense",
  refund: "refund",
  complaint: "complaint",
  notice: "notice",
  visitor: "visitor",
  meter_reading: "meter_reading",
  exit_clearance: "exit_clearance",
  property: "property",
  room: "room",
  person: "person",
  meter: "meter",
} as const

export type AuditEntityType = keyof typeof AUDIT_ENTITY_TYPES
