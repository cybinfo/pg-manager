/**
 * Display Helpers
 *
 * Centralized helpers for resolving display names, avatars, and other UI values
 * from entity data with proper fallback chains.
 *
 * @example
 * import { getDisplayName, getAvatarUrl } from "@/lib/display-helpers"
 *
 * const name = getDisplayName(tenant) // Uses person.name → tenant.name → "Unknown"
 * const avatar = getAvatarUrl(tenant) // Uses person.photo_url → photo_url → profile_photo
 */

// ============================================================================
// TYPES
// ============================================================================

interface PersonLike {
  name?: string | null
  photo_url?: string | null
}

interface EntityWithPerson {
  name?: string | null
  photo_url?: string | null
  profile_photo?: string | null
  person?: PersonLike | null
}

interface VisitorLike {
  visitor_name?: string | null
  visitor_contact?: {
    name?: string | null
    person?: PersonLike | null
  } | null
  person?: PersonLike | null
}

// ============================================================================
// NAME RESOLUTION
// ============================================================================

/**
 * Get display name with fallback chain: person.name → entity.name → default
 * Used for tenants, staff, and other entities linked to people table
 *
 * @example
 * const name = getDisplayName(tenant) // "John Doe"
 * const name = getDisplayName(staff, "Staff Member") // Custom default
 */
export function getDisplayName(
  entity: EntityWithPerson | null | undefined,
  defaultName = "Unknown"
): string {
  if (!entity) return defaultName
  return entity.person?.name || entity.name || defaultName
}

/**
 * Get visitor display name with deep fallback chain
 * visitor.person.name → visitor_contact.person.name → visitor_contact.name → visitor_name → default
 *
 * @example
 * const name = getVisitorDisplayName(visitor) // "Jane Smith"
 */
export function getVisitorDisplayName(
  visitor: VisitorLike | null | undefined,
  defaultName = "Unknown Visitor"
): string {
  if (!visitor) return defaultName

  return (
    visitor.person?.name ||
    visitor.visitor_contact?.person?.name ||
    visitor.visitor_contact?.name ||
    visitor.visitor_name ||
    defaultName
  )
}

// ============================================================================
// AVATAR URL RESOLUTION
// ============================================================================

/**
 * Get avatar URL with fallback chain: person.photo_url → photo_url → profile_photo
 * Returns undefined if no photo available (for Avatar component to show initials)
 *
 * @example
 * <Avatar name={name} src={getAvatarUrl(tenant)} />
 */
export function getAvatarUrl(
  entity: EntityWithPerson | null | undefined
): string | undefined {
  if (!entity) return undefined

  return (
    entity.person?.photo_url ||
    entity.photo_url ||
    entity.profile_photo ||
    undefined
  )
}

/**
 * Get visitor avatar URL with deep fallback chain
 *
 * @example
 * <Avatar name={name} src={getVisitorAvatarUrl(visitor)} />
 */
export function getVisitorAvatarUrl(
  visitor: VisitorLike | null | undefined
): string | undefined {
  if (!visitor) return undefined

  return (
    visitor.person?.photo_url ||
    visitor.visitor_contact?.person?.photo_url ||
    undefined
  )
}

// ============================================================================
// COMBINED DISPLAY DATA
// ============================================================================

interface DisplayData {
  name: string
  photoUrl?: string
}

/**
 * Get both name and avatar URL for an entity
 * Convenient for components that need both values
 *
 * @example
 * const { name, photoUrl } = getEntityDisplayData(tenant)
 * <Avatar name={name} src={photoUrl} />
 */
export function getEntityDisplayData(
  entity: EntityWithPerson | null | undefined,
  defaultName = "Unknown"
): DisplayData {
  return {
    name: getDisplayName(entity, defaultName),
    photoUrl: getAvatarUrl(entity),
  }
}

/**
 * Get both name and avatar URL for a visitor
 *
 * @example
 * const { name, photoUrl } = getVisitorDisplayData(visitor)
 */
export function getVisitorDisplayData(
  visitor: VisitorLike | null | undefined,
  defaultName = "Unknown Visitor"
): DisplayData {
  return {
    name: getVisitorDisplayName(visitor, defaultName),
    photoUrl: getVisitorAvatarUrl(visitor),
  }
}

// ============================================================================
// PHONE NUMBER DISPLAY
// ============================================================================

/**
 * Get primary phone number from entity
 * Handles both string and array formats
 *
 * @example
 * const phone = getDisplayPhone(tenant) // "+91 98765 43210"
 */
export function getDisplayPhone(
  entity: { phone?: string | null; phone_numbers?: string[] | null } | null | undefined
): string | undefined {
  if (!entity) return undefined

  // Prefer phone_numbers array (first entry)
  if (entity.phone_numbers && entity.phone_numbers.length > 0) {
    return entity.phone_numbers[0]
  }

  // Fallback to phone field
  return entity.phone || undefined
}

// ============================================================================
// PROPERTY/ROOM DISPLAY
// ============================================================================

/**
 * Get property name from entity with property join
 *
 * @example
 * const propertyName = getPropertyName(tenant) // "Sunrise PG"
 */
export function getPropertyName(
  entity: { property?: { name?: string } | null } | null | undefined
): string | undefined {
  return entity?.property?.name || undefined
}

/**
 * Get room number from entity with room join
 *
 * @example
 * const roomNumber = getRoomNumber(tenant) // "101"
 */
export function getRoomNumber(
  entity: { room?: { room_number?: string } | null } | null | undefined
): string | undefined {
  return entity?.room?.room_number || undefined
}

/**
 * Get formatted location string (Property - Room)
 *
 * @example
 * const location = getLocation(tenant) // "Sunrise PG - Room 101"
 */
export function getLocation(
  entity: {
    property?: { name?: string } | null
    room?: { room_number?: string } | null
  } | null | undefined
): string | undefined {
  const property = getPropertyName(entity)
  const room = getRoomNumber(entity)

  if (property && room) {
    return `${property} - Room ${room}`
  }
  if (property) {
    return property
  }
  if (room) {
    return `Room ${room}`
  }
  return undefined
}
