"use client"

import * as React from "react"
import { DetailPageContent } from "./detail-page-content"
import { DetailSection } from "./detail-components"
import { RecordMetadataContent } from "./record-metadata"
import { ActivityHistoryContent } from "./activity-history"
import { Calendar, History } from "lucide-react"
import type { AuditableEntity } from "@/types/audit.types"

interface DetailPageTemplateProps {
  /**
   * The children to render inside the sortable masonry layout.
   * Typically DetailSection components.
   */
  children: React.ReactNode

  /**
   * Unique key for storing layout preferences.
   * Should be consistent for all pages of the same type.
   * e.g., "tenant-detail", "property-detail", "bill-detail"
   */
  layoutKey: string

  /**
   * The entity type for audit display.
   * Must match the entity_type in audit_events table.
   * e.g., "tenant", "property", "bill"
   */
  entityType: string

  /**
   * The record containing audit fields (id, created_at, etc.)
   */
  record: Partial<AuditableEntity> & { id: string }

  /**
   * Number of columns for the masonry layout.
   * Default: 2
   */
  columns?: 1 | 2 | 3

  /**
   * Gap between sections.
   * Default: "md"
   */
  gap?: "sm" | "md" | "lg"

  /**
   * Whether to show the customize layout button.
   * Default: true
   */
  editable?: boolean

  /**
   * Whether to show the activity history section.
   * Default: true
   */
  showActivityHistory?: boolean

  /**
   * Maximum number of activity items to show.
   * Default: 5
   */
  maxActivityItems?: number

  /**
   * Optional className for the container.
   */
  className?: string
}

/**
 * DetailPageTemplate - Centralized template for all detail pages
 *
 * Provides:
 * - Sortable masonry layout with customization
 * - Automatic Record Information section
 * - Automatic Activity History section
 * - Consistent styling across all detail pages
 *
 * @example
 * ```tsx
 * <DetailPageTemplate
 *   layoutKey="tenant-detail"
 *   entityType="tenant"
 *   record={tenant}
 * >
 *   <DetailSection title="Room Details" icon={Home}>
 *     ...
 *   </DetailSection>
 *   <DetailSection title="Pending Dues" icon={AlertCircle}>
 *     ...
 *   </DetailSection>
 * </DetailPageTemplate>
 * ```
 */
export function DetailPageTemplate({
  children,
  layoutKey,
  entityType,
  record,
  columns = 2,
  gap = "md",
  editable = true,
  showActivityHistory = true,
  maxActivityItems = 5,
  className,
}: DetailPageTemplateProps) {
  // DEBUG: Log props
  console.log("[DetailPageTemplate] Rendering:", { layoutKey, entityType, recordId: record?.id })
  console.log("[DetailPageTemplate] Imported components:", {
    DetailPageContent: typeof DetailPageContent,
    DetailSection: typeof DetailSection,
    RecordMetadataContent: typeof RecordMetadataContent,
    ActivityHistoryContent: typeof ActivityHistoryContent,
  })

  return (
    <DetailPageContent
      layout="sortable-masonry"
      layoutKey={layoutKey}
      columns={columns}
      gap={gap}
      editable={editable}
      className={className}
    >
      {children}
      {/* Record Information - rendered as separate sortable item */}
      <DetailSection
        title="Record Information"
        description="Created and updated details"
        icon={Calendar}
      >
        <RecordMetadataContent
          record={{
            created_at: record.created_at,
            updated_at: record.updated_at,
            created_by: record.created_by,
            deleted_at: record.deleted_at,
            deleted_by: record.deleted_by,
          }}
        />
      </DetailSection>
      {/* Activity History - rendered as separate sortable item */}
      {showActivityHistory && (
        <DetailSection
          title="Activity History"
          description="Recent changes to this record"
          icon={History}
        >
          <ActivityHistoryContent
            entityType={entityType}
            entityId={record.id}
            maxItems={maxActivityItems}
          />
        </DetailSection>
      )}
    </DetailPageContent>
  )
}
