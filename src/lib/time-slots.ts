/**
 * Time Slot Utilities
 *
 * Shared helpers for library membership time slot parsing, serialization,
 * and hour calculation. Used by library-members/new and library-members/renew.
 *
 * Time slots are stored in the DB as a JSON string: '[{"start":"09:00","end":"13:00"}]'
 * Old format (single slot): "09:00-13:00" — still supported for reading.
 */

export interface TimeSlot {
  start: string
  end: string
}

/**
 * Format "HH:MM" → "9:00 AM" for display.
 */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

/**
 * Calculate hours in a single time slot.
 */
export function calcSlotHours(slot: TimeSlot): number {
  if (!slot.start || !slot.end) return 0
  const [sh, sm] = slot.start.split(":").map(Number)
  const [eh, em] = slot.end.split(":").map(Number)
  let hours = (eh * 60 + em - sh * 60 - sm) / 60
  if (hours < 0) hours += 24
  return hours
}

/**
 * Serialize time slots for DB storage.
 * Empty/invalid slots are filtered out.
 * Returns null if no valid slots.
 */
export function serializeTimeSlots(slots: TimeSlot[]): string | null {
  const valid = slots.filter((s) => s.start && s.end)
  if (valid.length === 0) return null
  return JSON.stringify(valid.map((s) => ({ start: s.start, end: s.end })))
}

/**
 * Parse time_slot from DB into TimeSlot[].
 * Handles: null, JSON array format, legacy "HH:MM-HH:MM" format.
 */
export function parseTimeSlots(raw: string | null): TimeSlot[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((s: { start: string; end: string }) => ({
        start: s.start || "",
        end: s.end || "",
      }))
    }
  } catch {
    // Not JSON — try legacy format
  }
  if (raw.includes("-")) {
    const [st, et] = raw.split("-")
    return [{ start: st.trim(), end: et.trim() }]
  }
  return []
}
