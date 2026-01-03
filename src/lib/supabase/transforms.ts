/**
 * Supabase JOIN Transform Utilities
 *
 * Supabase returns joined data in different formats depending on:
 * - Query type (JS client vs REST API)
 * - Relationship type (one-to-one vs one-to-many)
 *
 * These utilities handle both array and object formats safely.
 */

/**
 * Transform a Supabase JOIN result to a single object or null.
 * Handles both array format (older behavior) and object format (current behavior).
 *
 * @example
 * // Usage in data transformation
 * const transformed = data.map(item => ({
 *   ...item,
 *   property: transformJoin(item.property),
 *   room: transformJoin(item.room),
 *   tenant: transformJoin(item.tenant),
 * }))
 */
export function transformJoin<T>(value: T[] | T | null | undefined): T | null {
  if (value === null || value === undefined) {
    return null
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null
  }
  return value
}

/**
 * Transform multiple JOIN fields on an object.
 *
 * @example
 * const tenant = transformJoins(rawTenant, ['property', 'room'])
 * // tenant.property and tenant.room are now single objects or null
 */
export function transformJoins<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data }
  for (const field of fields) {
    result[field] = transformJoin(data[field] as unknown[]) as T[keyof T]
  }
  return result
}

/**
 * Transform an array of records, applying JOIN transforms to specified fields.
 *
 * @example
 * const tenants = transformArrayJoins(rawTenants, ['property', 'room'])
 */
export function transformArrayJoins<T extends Record<string, unknown>>(
  data: T[],
  fields: (keyof T)[]
): T[] {
  return data.map(item => transformJoins(item, fields))
}
