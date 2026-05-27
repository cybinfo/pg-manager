import type { createClient } from "@/lib/supabase/client"
import { softDelete, cascadeSoftDelete } from "@/lib/audit"
import { logger } from "@/lib/logger"

type SupabaseClient = ReturnType<typeof createClient>

export interface DeletePersonParams {
  hasTenantHistory: boolean
  hasStaffHistory: boolean
}

export async function deletePerson(
  supabase: SupabaseClient,
  personId: string,
  userId: string,
  params: DeletePersonParams,
): Promise<void> {
  const cascadeConfigs: { table: "tenants" | "staff_members" | "visitor_contacts"; foreignKey: string }[] = [
    { table: "visitor_contacts", foreignKey: "person_id" },
  ]

  if (params.hasStaffHistory) {
    cascadeConfigs.push({ table: "staff_members", foreignKey: "person_id" })
  }
  if (params.hasTenantHistory) {
    cascadeConfigs.push({ table: "tenants", foreignKey: "person_id" })
  }

  const { errors: cascadeErrors } = await cascadeSoftDelete(personId, userId, cascadeConfigs)

  if (cascadeErrors.length > 0) {
    logger.error("Cascade soft delete errors:", { detail: cascadeErrors })
  }

  await supabase.from("person_roles").delete().eq("person_id", personId)

  const { error } = await softDelete("people", personId, userId)
  if (error) throw error
}
