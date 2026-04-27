"use client"

import { User, Calendar, Clock, Trash2, AlertTriangle } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"

interface UserInfo {
  id: string
  email?: string
  name?: string
}

interface RecordMetadataProps {
  record: {
    created_at?: string | null
    updated_at?: string | null
    created_by?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
  }
  className?: string
  showDeleted?: boolean
  compact?: boolean
}

/**
 * RecordMetadata - Displays audit information for a record
 *
 * Shows created_at, updated_at, created_by, and soft delete status
 * with user name resolution from user_profiles table.
 */
export function RecordMetadata({
  record,
  className,
  showDeleted = true,
  compact = false,
}: RecordMetadataProps) {
  const [createdByUser, setCreatedByUser] = useState<UserInfo | null>(null)
  const [deletedByUser, setDeletedByUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch user info for created_by and deleted_by
  useEffect(() => {
    async function fetchUserInfo() {
      const userIds = [record.created_by, record.deleted_by].filter(Boolean) as string[]
      if (userIds.length === 0) return

      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("user_profiles")
          .select("id, email, name")
          .in("id", userIds)

        if (data) {
          const usersMap = new Map(data.map((u: UserInfo) => [u.id, u]))
          if (record.created_by) {
            setCreatedByUser(usersMap.get(record.created_by) as UserInfo | null ?? null)
          }
          if (record.deleted_by) {
            setDeletedByUser(usersMap.get(record.deleted_by) as UserInfo | null ?? null)
          }
        }
      } catch (error) {
        logger.error("Failed to fetch user info:", { detail: error })
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [record.created_by, record.deleted_by])

  const getUserDisplayName = (user: UserInfo | null, userId?: string) => {
    if (loading) return "Loading..."
    if (user?.name) return user.name
    if (user?.email) return user.email.split("@")[0]
    return userId ? `User ${userId.slice(0, 8)}...` : "Unknown"
  }

  const isDeleted = !!record.deleted_at

  if (compact) {
    return (
      <div className={cn("flex items-center gap-4 text-xs text-muted-foreground", className)}>
        {record.created_at && (
          <span
            className="flex items-center gap-1 cursor-default"
            title={`Created: ${formatDateTime(record.created_at)}${record.created_by ? `\nBy: ${getUserDisplayName(createdByUser, record.created_by)}` : ""}`}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(record.created_at)}
          </span>
        )}

        {record.updated_at && record.updated_at !== record.created_at && (
          <span
            className="flex items-center gap-1 cursor-default"
            title={`Last updated: ${formatDateTime(record.updated_at)}`}
          >
            <Clock className="h-3 w-3" />
            Updated {formatDate(record.updated_at)}
          </span>
        )}

        {showDeleted && isDeleted && (
          <span className="flex items-center gap-1 text-destructive">
            <Trash2 className="h-3 w-3" />
            Deleted
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      {/* Deleted Warning Banner */}
      {showDeleted && isDeleted && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-md">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">This record has been deleted</span>
          {record.deleted_at && (
            <span className="text-xs opacity-80">
              on {formatDateTime(record.deleted_at)}
            </span>
          )}
          {record.deleted_by && (
            <span className="text-xs opacity-80">
              by {getUserDisplayName(deletedByUser, record.deleted_by)}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-muted-foreground">
        {/* Created Info */}
        {record.created_at && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <div>
              <span className="text-xs uppercase tracking-wide">Created</span>
              <p className="text-foreground">{formatDateTime(record.created_at)}</p>
            </div>
          </div>
        )}

        {/* Created By */}
        {record.created_by && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <div>
              <span className="text-xs uppercase tracking-wide">Created By</span>
              <p className="text-foreground">
                {getUserDisplayName(createdByUser, record.created_by)}
              </p>
            </div>
          </div>
        )}

        {/* Updated Info */}
        {record.updated_at && record.updated_at !== record.created_at && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <div>
              <span className="text-xs uppercase tracking-wide">Last Updated</span>
              <p className="text-foreground">{formatDateTime(record.updated_at)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * RecordMetadataInline - Compact inline version for list items
 */
export function RecordMetadataInline({
  createdAt,
  createdBy,
  className,
}: {
  createdAt?: string
  createdBy?: string
  className?: string
}) {
  return (
    <RecordMetadata
      record={{ created_at: createdAt, created_by: createdBy }}
      compact
      showDeleted={false}
      className={className}
    />
  )
}

/**
 * RecordMetadataContent - Content-only version for use inside DetailSection
 *
 * Uses InfoRow pattern for consistent vertical key-value display,
 * designed to be used inside a DetailSection component for consistent UI.
 */
export function RecordMetadataContent({
  record,
  showDeleted = true,
}: {
  record: {
    created_at?: string | null
    updated_at?: string | null
    created_by?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
  }
  showDeleted?: boolean
}) {
  const [createdByUser, setCreatedByUser] = useState<UserInfo | null>(null)
  const [deletedByUser, setDeletedByUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch user info for created_by and deleted_by
  useEffect(() => {
    async function fetchUserInfo() {
      const userIds = [record.created_by, record.deleted_by].filter(Boolean) as string[]
      if (userIds.length === 0) return

      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("user_profiles")
          .select("id, email, name")
          .in("id", userIds)

        if (data) {
          const usersMap = new Map(data.map((u: UserInfo) => [u.id, u]))
          if (record.created_by) {
            setCreatedByUser(usersMap.get(record.created_by) as UserInfo | null ?? null)
          }
          if (record.deleted_by) {
            setDeletedByUser(usersMap.get(record.deleted_by) as UserInfo | null ?? null)
          }
        }
      } catch (error) {
        logger.error("Failed to fetch user info:", { detail: error })
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [record.created_by, record.deleted_by])

  const getUserDisplayName = (user: UserInfo | null, userId?: string) => {
    if (loading) return "Loading..."
    if (user?.name) return user.name
    if (user?.email) return user.email.split("@")[0]
    return userId ? `User ${userId.slice(0, 8)}...` : "Unknown"
  }

  const isDeleted = !!record.deleted_at

  return (
    <div className="space-y-0">
      {/* Deleted Warning Banner */}
      {showDeleted && isDeleted && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-destructive/10 text-destructive rounded-md">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">This record has been deleted</span>
          {record.deleted_at && (
            <span className="text-xs opacity-80">
              on {formatDateTime(record.deleted_at)}
            </span>
          )}
          {record.deleted_by && (
            <span className="text-xs opacity-80">
              by {getUserDisplayName(deletedByUser, record.deleted_by)}
            </span>
          )}
        </div>
      )}

      {/* Created */}
      {record.created_at && (
        <div className="flex items-start justify-between py-2.5 border-b border-dashed">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Created
          </div>
          <div className="text-sm font-medium text-right">
            {formatDateTime(record.created_at)}
          </div>
        </div>
      )}

      {/* Created By */}
      {record.created_by && (
        <div className="flex items-start justify-between py-2.5 border-b border-dashed">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            Created By
          </div>
          <div className="text-sm font-medium text-right">
            {getUserDisplayName(createdByUser, record.created_by)}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {record.updated_at && record.updated_at !== record.created_at && (
        <div className="flex items-start justify-between py-2.5 border-b border-dashed last:border-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last Updated
          </div>
          <div className="text-sm font-medium text-right">
            {formatDateTime(record.updated_at)}
          </div>
        </div>
      )}
    </div>
  )
}
