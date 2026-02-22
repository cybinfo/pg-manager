"use client"

/**
 * Reusable Column Render Components
 *
 * Shared cell renderers for common patterns in DataTable columns.
 * Eliminates duplicate avatar+name+phone renders across pages.
 */

import { Avatar } from "@/components/ui/avatar"

export function PersonAvatarCell({ name, phone, photoUrl, subtitle, avatarClassName }: {
  name: string
  phone?: string | null
  photoUrl?: string | null
  subtitle?: string | null
  avatarClassName?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={photoUrl || undefined} size="sm" className={avatarClassName} />
      <div className="min-w-0">
        <div className="font-medium truncate">{name}</div>
        {(phone || subtitle) && (
          <div className="text-xs text-muted-foreground">{phone || subtitle}</div>
        )}
      </div>
    </div>
  )
}