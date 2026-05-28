import type { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { startOfMonth, endOfMonth } from "@/lib/date-helpers"
import { formatMonthYear } from "@/lib/format"
import { withCreatedBy } from "@/lib/audit"

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

// ============================================================================
// Create Meter Reading With Charges (extracted from meter-readings/new page)
// ============================================================================

interface MeterAssignment {
  room_id: string
  room_number: string
  start_reading: number
}

interface MeterInfo {
  id: string
  meter_number: string
  meter_type: string
  property_id: string
  current_assignment: MeterAssignment
}

interface ChargeTypeInfo {
  id: string
  name: string
  calculation_config: { rate_per_unit?: number; split_by?: string } | null
}

interface TenantInfo {
  id: string
  name: string
}

export interface CreateMeterReadingParams {
  userId: string
  meter: MeterInfo
  readingDate: string
  readingValue: number
  previousReadingValue: number | null
  unitsConsumed: number | null
  notes: string | null
  matchingChargeType: ChargeTypeInfo | null
  generateCharge: boolean
  roomTenants: TenantInfo[]
  consumptionAlertsEnabled: boolean
}

export interface CreateMeterReadingResult {
  readingId: string
  chargeWarning?: string
  anomaly?: {
    isAnomaly: boolean
    alertType: "high" | "low" | null
    currentUnits: number
    averageUnits: number
  }
}

/**
 * Inserts a meter reading, optionally generates tenant charges, and checks for
 * consumption anomalies. Does NOT send emails — returns anomaly data so the
 * caller (page or API route) can fire the alert email.
 */
export async function createMeterReadingWithCharges(
  supabase: SupabaseClient,
  params: CreateMeterReadingParams
): Promise<CreateMeterReadingResult> {
  const {
    userId,
    meter,
    readingDate,
    readingValue,
    previousReadingValue,
    unitsConsumed,
    notes,
    matchingChargeType,
    generateCharge,
    roomTenants,
    consumptionAlertsEnabled,
  } = params

  // Duplicate reading check
  const { data: existingReading } = await supabase
    .from("meter_readings")
    .select("id")
    .eq("meter_id", meter.id)
    .eq("reading_date", readingDate)
    .maybeSingle()

  if (existingReading) {
    throw new Error(
      "A reading already exists for this meter on the selected date. Please choose a different date."
    )
  }

  // Insert meter reading
  const readingData = withCreatedBy(
    {
      owner_id: userId,
      property_id: meter.property_id,
      room_id: meter.current_assignment.room_id,
      charge_type_id: matchingChargeType?.id || null,
      meter_id: meter.id,
      reading_date: readingDate,
      reading_value: readingValue,
      previous_reading: previousReadingValue,
      units_consumed: unitsConsumed,
      notes: notes || null,
    },
    userId
  )

  const { data: meterReadingData, error } = await supabase
    .from("meter_readings")
    .insert(readingData)
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  const readingId = meterReadingData.id
  let chargeWarning: string | undefined

  // Generate charges if requested
  if (generateCharge && unitsConsumed && unitsConsumed > 0 && roomTenants.length > 0 && matchingChargeType) {
    const ratePerUnit = matchingChargeType.calculation_config?.rate_per_unit || 0

    if (ratePerUnit > 0) {
      const chargeResult = await generateChargesOnCreate(supabase, {
        readingId,
        readingDate,
        unitsConsumed,
        propertyId: meter.property_id,
        chargeTypeId: matchingChargeType.id,
        ratePerUnit,
        splitByOccupants: matchingChargeType.calculation_config?.split_by === "occupants",
        meterId: meter.id,
        meterNumber: meter.meter_number,
        tenants: roomTenants,
        ownerId: userId,
      })

      if (!chargeResult.success) {
        chargeWarning = "Meter reading saved, but failed to generate charges"
      }
    }
  }

  // Consumption anomaly detection — returns data; caller sends the email
  let anomaly: CreateMeterReadingResult["anomaly"]
  if (consumptionAlertsEnabled && unitsConsumed !== null && unitsConsumed > 0) {
    try {
      const { data: recentReadings } = await supabase
        .from("meter_readings")
        .select("units_consumed")
        .eq("meter_id", meter.id)
        .not("id", "eq", readingId)
        .not("units_consumed", "is", null)
        .order("reading_date", { ascending: false })
        .limit(3)

      if (recentReadings && recentReadings.length >= 2) {
        const validUnits = recentReadings
          .map((r: { units_consumed: number | null }) => r.units_consumed)
          .filter((u: number | null): u is number => u !== null && u > 0)

        if (validUnits.length >= 2) {
          const avg = validUnits.reduce((sum: number, u: number) => sum + u, 0) / validUnits.length
          const isHigh = unitsConsumed > avg * 2
          const isLow = unitsConsumed < avg * 0.5

          if (isHigh || isLow) {
            anomaly = {
              isAnomaly: true,
              alertType: isHigh ? "high" : "low",
              currentUnits: unitsConsumed,
              averageUnits: avg,
            }
          }
        }
      }
    } catch (err) {
      logger.error("Consumption anomaly check failed", { error: String(err) })
    }
  }

  return { readingId, chargeWarning, anomaly }
}
