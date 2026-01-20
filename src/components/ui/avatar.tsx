"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ImageLightbox } from "./image-lightbox"

// ============================================
// UI-008: Centralized Avatar Photo Resolution
// ============================================

/**
 * UI-008: Centralized photo URL resolution
 *
 * Handles the common pattern where entities may have photos stored in
 * different fields depending on whether they came from:
 * - `profile_photo` (from user_profiles table)
 * - `photo_url` (from tenants table)
 *
 * This utility ensures consistent fallback behavior across the app.
 *
 * @example
 * // In a component with tenant data:
 * <Avatar name={tenant.name} src={getAvatarUrl(tenant)} />
 *
 * // Or with explicit fields:
 * <Avatar name={name} src={getAvatarUrl({ profile_photo, photo_url })} />
 */
export function getAvatarUrl(entity: {
  profile_photo?: string | null
  photo_url?: string | null
} | null | undefined): string | undefined {
  if (!entity) return undefined
  // Prefer profile_photo (more specific/user-uploaded) over photo_url
  return entity.profile_photo || entity.photo_url || undefined
}

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
}

interface AvatarProps {
  /** Name to generate initials from */
  name: string
  /** Size variant */
  size?: AvatarSize
  /** Optional image URL */
  src?: string | null
  /** Additional className */
  className?: string
  /** Enable click to view full size (only works if src is provided) */
  clickable?: boolean
}

export function Avatar({
  name,
  size = "md",
  src,
  className,
  clickable = false,
}: AvatarProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const initials = getInitials(name)

  const handleClick = () => {
    if (clickable && src) {
      setLightboxOpen(true)
    }
  }

  if (src) {
    return (
      <>
        <img
          src={src}
          alt={name}
          onClick={handleClick}
          className={cn(
            "rounded-full object-cover",
            sizeClasses[size],
            clickable && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
            className
          )}
        />
        {clickable && (
          <ImageLightbox
            src={src}
            alt={name}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}

/** Get initials from a name (1-2 characters) */
function getInitials(name: string): string {
  if (!name) return "?"

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Avatar group for showing multiple avatars */
interface AvatarGroupProps {
  /** Array of names */
  names: string[]
  /** Maximum avatars to show before +N */
  max?: number
  /** Size of avatars */
  size?: AvatarSize
  /** Additional className */
  className?: string
}

export function AvatarGroup({
  names,
  max = 3,
  size = "sm",
  className,
}: AvatarGroupProps) {
  const visible = names.slice(0, max)
  const remaining = names.length - max

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((name, i) => (
        <Avatar
          key={i}
          name={name}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium ring-2 ring-background",
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
