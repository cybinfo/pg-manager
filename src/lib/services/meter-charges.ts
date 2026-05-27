import type { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { startOfMonth, endOfMonth } from "@/lib/date-helpers"
import { formatMonthYear } from "@/lib/format"

type SupabaseClient = ReturnType<typeof createClient>

interface ChargeTypeConfig {
  rate_per_unit?: number
  split_by?: string
}

/**
 * Generates tenant charges for an existing meter reading.
 * Called from the reading detail page after the reading is already saved.
 */
export async function generateMeterCharges(
  supabase: SupabaseClient,
  readingId: string,
  ownerId: string
): Promise<{ success: boolean; chargesCount?: number; error?: string }> {
  // Fetch the meter reading with its charge type config
  const { data: reading, error: readingError } = await supabase
    .from("meter_readings")
    .select(`
      id,
      reading_date,
      units_consumed,
      property:properties(id),
      room:rooms(id),
      charge_type:charge_types(id, calculation_config)
    `)
    .eq("id", readingId)
    .single()

  if (readingError || !reading) {
    logger.error("generateMeterCharges: failed to fetch reading", { readingId, error: String(readingError) })
    return { success: false, error: "Failed to fetch meter reading" }
  }

  const room = Array.isArray(reading.room) ? reading.room[0] : reading.room
  const property = Array.isArray(reading.property) ? reading.property[0] : reading.property
  const chargeType = Array.isArray(reading.charge_type) ? reading.charge_type[0] : reading.charge_type

  if (!reading.units_consumed || reading.units_consumed <= 0) {
    return { success: false, error: "No units consumed — charges cannot be generated" }
  }

  const config = chargeType?.calculation_config as ChargeTypeConfig | null
  const ratePerUnit = config?.rate_per_unit
  if (!ratePerUnit || ratePerUnit <= 0) {
    return { success: false, error: "No rate configured for this meter type" }
  }

  // Fetch active tenants in the room
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("room_id", room?.id)
    .eq("status", "active")

  if (tenantsError) {
    logger.error("generateMeterCharges: failed to fetch tenants", { roomId: room?.id, error: String(tenantsError) })
    return { success: false, error: "Failed to fetch tenants" }
  }

  if (!tenants || tenants.length === 0) {
    return { success: false, error: "No active tenants in this room" }
  }

  const splitByOccupants = config?.split_by === "occupants"
  const totalAmount = reading.units_consumed * ratePerUnit
  const amountPerTenant = splitByOccupants ? totalAmount / tenants.length : totalAmount

  const readingDate = new Date(reading.reading_date)
  const dueDate = endOfMonth(readingDate)
  const forPeriod = formatMonthYear(readingDate)

  const chargeInserts = tenants.map((tenant: { id: string; name: string }) => ({
    owner_id: ownerId,
    tenant_id: tenant.id,
    property_id: property?.id,
    charge_type_id: chargeType?.id,
    amount: splitByOccupants ? amountPerTenant : totalAmount,
    due_date: dueDate.toISOString().split("T")[0],
    for_period: forPeriod,
    period_start: startOfMonth(readingDate).toISOString().split("T")[0],
    period_end: dueDate.toISOString().split("T")[0],
    calculation_details: {
      meter_reading_id: readingId,
      units: reading.units_consumed,
      rate: ratePerUnit,
      total_amount: totalAmount,
      occupants: tenants.length,
      split_by: splitByOccupants ? "occupants" : "room",
      per_person: splitByOccupants ? amountPerTenant : totalAmount,
      method: "meter_reading",
    },
    status: "pending",
    notes: `Generated from meter reading on ${reading.reading_date}`,
  }))

  const { error: chargeError } = await supabase.from("charges").insert(chargeInserts)

  if (chargeError) {
    logger.error("generateMeterCharges: failed to insert charges", { readingId, error: String(chargeError) })
    return { success: false, error: "Failed to generate charges" }
  }

  return { success: true, chargesCount: tenants.length }
}

interface GenerateChargesOnCreateParams {
  readingId: string
  readingDate: string
  unitsConsumed: number
  propertyId: string
  chargeTypeId: string
  ratePerUnit: number
  splitByOccupants: boolean
  meterId: string
  meterNumber: string
  tenants: Array<{ id: string; name: string }>
  ownerId: string
}

/**
 * Generates tenant charges immediately after a new meter reading is created.
 * Called from the new reading form's customSubmit after the reading row is saved.
 * Includes meter_id and meter_number in calculation_details (not available in the
 * post-hoc flow because the detail page doesn't re-query those fields).
 */
export async function generateChargesOnCreate(
  supabase: SupabaseClient,
  params: GenerateChargesOnCreateParams
): Promise<{ success: boolean; error?: string }> {
  const {
    readingId, readingDate, unitsConsumed, propertyId, chargeTypeId,
    ratePerUnit, splitByOccupants, meterId, meterNumber, tenants, ownerId,
  } = params

  if (tenants.length === 0) {
    return { success: false, error: "No tenants provided" }
  }

  const totalAmount = unitsConsumed * ratePerUnit
  const amountPerTenant = splitByOccupants ? totalAmount / tenants.length : totalAmount

  const date = new Date(readingDate)
  const dueDate = endOfMonth(date)
  const forPeriod = formatMonthYear(date)

  const chargeInserts = tenants.map((tenant) => ({
    owner_id: ownerId,
    tenant_id: tenant.id,
    property_id: propertyId,
    charge_type_id: chargeTypeId,
    amount: splitByOccupants ? amountPerTenant : totalAmount,
    due_date: dueDate.toISOString().split("T")[0],
    for_period: forPeriod,
    period_start: startOfMonth(date).toISOString().split("T")[0],
    period_end: dueDate.toISOString().split("T")[0],
    calculation_details: {
      meter_reading_id: readingId,
      meter_id: meterId,
      meter_number: meterNumber,
      units: unitsConsumed,
      rate: ratePerUnit,
      total_amount: totalAmount,
      occupants: tenants.length,
      split_by: splitByOccupants ? "occupants" : "room",
      per_person: splitByOccupants ? amountPerTenant : totalAmount,
      method: "meter_reading",
    },
    status: "pending",
    notes: `Auto-generated from meter ${meterNumber} reading on ${readingDate}`,
  }))

  const { error } = await supabase.from("charges").insert(chargeInserts)

  if (error) {
    logger.error("generateChargesOnCreate: failed to insert charges", { readingId, error: String(error) })
    return { success: false, error: "Failed to generate charges" }
  }

  return { success: true }
}
