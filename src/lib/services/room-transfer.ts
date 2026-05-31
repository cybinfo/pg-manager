import type { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { getTodayISO } from "@/lib/date-helpers"
import type { Tenant, TenantStay } from "@/types/tenants.types"

type SupabaseClient = ReturnType<typeof createClient>

export interface TransferRoomParams {
  tenant: Tenant
  stays: TenantStay[]
  toRoomId: string
  toPropertyId: string
  oldRent: number
  newRent: number
  reason: string | null
  notes: string | null
}

export async function transferTenantRoom(
  supabase: SupabaseClient,
  params: TransferRoomParams,
  ownerId: string,
): Promise<void> {
  const { tenant, stays, toRoomId, toPropertyId, oldRent, newRent, reason, notes } = params

  await supabase.from("room_transfers").insert(withCreatedBy({
    owner_id: ownerId,
    tenant_id: tenant.id,
    from_property_id: tenant.property?.id,
    from_room_id: tenant.room?.id,
    to_property_id: toPropertyId,
    to_room_id: toRoomId,
    transfer_date: getTodayISO(),
    reason,
    notes,
    old_rent: oldRent,
    new_rent: newRent,
  }, ownerId))

  await supabase
    .from("tenant_stays")
    .update({ status: "transferred", exit_date: getTodayISO(), exit_reason: "transferred" })
    .eq("tenant_id", tenant.id)
    .eq("status", "active")

  const stayNumber = stays.length > 0 ? Math.max(...stays.map((s) => s.stay_number)) + 1 : 1
  await supabase.from("tenant_stays").insert({
    owner_id: ownerId,
    tenant_id: tenant.id,
    entity_id: toPropertyId,
    room_id: toRoomId,
    join_date: getTodayISO(),
    monthly_rent: newRent,
    security_deposit: tenant.security_deposit,
    status: "active",
    stay_number: stayNumber,
  })

  await supabase
    .from("tenants")
    .update({ entity_id: toPropertyId, room_id: toRoomId, monthly_rent: newRent })
    .eq("id", tenant.id)
}
