/**
 * CSV Import Pipeline — Library Members
 *
 * Pure parsing and validation functions for the bulk import page.
 * No side effects, no Supabase calls.
 */

export interface ParsedRow {
  rowNumber: number
  name: string
  phone: string
  email: string
  gender: string
  plan_name: string
  slot: string
  seat_number: string
  errors: string[]
  valid: boolean
}

const VALID_SLOTS = ["Morning", "Evening", "Night", "24 Hours"]

/**
 * Parse a single CSV line, handling quoted fields and escaped double-quotes.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++ // Skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

/**
 * Parse a full CSV text into headers and data rows.
 * Returns empty headers/rows for empty input.
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows = lines.slice(1).map((line) => parseCSVLine(line))

  return { headers, rows }
}

/**
 * Normalize slot strings to canonical casing.
 * Accepts common variations: "24hours", "full day", "fullday", etc.
 */
export function normalizeSlot(slot: string): string {
  if (!slot) return ""
  const lower = slot.toLowerCase().trim()
  if (lower === "morning") return "Morning"
  if (lower === "evening") return "Evening"
  if (lower === "night") return "Night"
  if (lower === "24 hours" || lower === "24hours" || lower === "full day" || lower === "fullday") return "24 Hours"
  return slot.trim()
}

/**
 * Normalize gender strings to canonical lowercase values.
 * Returns "" for unrecognized values so the caller can flag them as invalid.
 */
export function normalizeGender(gender: string): string {
  if (!gender) return ""
  const lower = gender.toLowerCase().trim()
  if (lower === "m" || lower === "male") return "male"
  if (lower === "f" || lower === "female") return "female"
  if (lower === "o" || lower === "other") return "other"
  return ""
}

/**
 * Parse and validate a single CSV data row against the given headers.
 * @param planNames - list of valid plan names to check against
 */
export function validateRow(
  row: string[],
  headers: string[],
  rowNumber: number,
  planNames: string[],
): ParsedRow {
  const get = (field: string): string => {
    const idx = headers.indexOf(field)
    return idx >= 0 && idx < row.length ? row[idx].trim() : ""
  }

  const name = get("name")
  const phone = get("phone").replace(/\D/g, "")
  const email = get("email")
  const gender = normalizeGender(get("gender"))
  const planName = get("plan_name")
  const slot = normalizeSlot(get("slot"))
  const seatNumber = get("seat_number")

  const errors: string[] = []

  if (!name) errors.push("Name is required")

  if (!phone) {
    errors.push("Phone is required")
  } else if (phone.length !== 10) {
    errors.push("Phone must be 10 digits")
  } else if (!/^\d{10}$/.test(phone)) {
    errors.push("Phone must contain only digits")
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Invalid email format")
  }

  if (get("gender") && !gender) {
    errors.push(`Invalid gender "${get("gender")}" (use male/female/other)`)
  }

  if (planName && !planNames.some((p) => p.toLowerCase() === planName.toLowerCase())) {
    errors.push(`Plan "${planName}" not found`)
  }

  if (slot && !VALID_SLOTS.includes(slot)) {
    errors.push(`Invalid slot "${get("slot")}" (use Morning/Evening/Night/24 Hours)`)
  }

  return {
    rowNumber,
    name,
    phone,
    email,
    gender,
    plan_name: planName,
    slot: slot || "Morning",
    seat_number: seatNumber,
    errors,
    valid: errors.length === 0,
  }
}
