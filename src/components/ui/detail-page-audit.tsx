"use client"

import { RecordMetadata } from "./record-metadata"
import { ActivityHistory } from "./activity-history"
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
  if (layout === "compact") {
    return (
      <div className={className}>
        <RecordMetadata
          record={{
            created_at: record.created_at,
            updated_at: record.updated_at,
            created_by: record.created_by,
            deleted_at: record.deleted_at,
            deleted_by: record.deleted_by,
          }}
          compact
        />
      </div>
    )
  }

  if (layout === "stack" || !showActivityHistory) {
    return (
      <div className={`space-y-6 ${className || ""}`}>
        <RecordMetadata
          record={{
            created_at: record.created_at,
            updated_at: record.updated_at,
            created_by: record.created_by,
            deleted_at: record.deleted_at,
            deleted_by: record.deleted_by,
          }}
          className="p-4 border rounded-lg bg-muted/30"
        />
        {showActivityHistory && (
          <ActivityHistory
            entityType={entityType}
            entityId={record.id}
            maxItems={maxActivityItems}
            title="Activity History"
          />
        )}
      </div>
    )
  }

  // Default grid layout
  return (
    <div className={`grid gap-6 lg:grid-cols-2 ${className || ""}`}>
      <RecordMetadata
        record={{
          created_at: record.created_at,
          updated_at: record.updated_at,
          created_by: record.created_by,
          deleted_at: record.deleted_at,
          deleted_by: record.deleted_by,
        }}
        className="p-4 border rounded-lg bg-muted/30"
      />
      <ActivityHistory
        entityType={entityType}
        entityId={record.id}
        maxItems={maxActivityItems}
        title="Recent Activity"
      />
    </div>
  )
}

/**
 * Entity type mapping for audit_events table.
 * Use these constants to ensure consistency.
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
