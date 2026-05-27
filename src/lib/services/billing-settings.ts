import type { createClient } from "@/lib/supabase/client"
import type { UtilityRate } from "@/types/settings.types"

type SupabaseClient = ReturnType<typeof createClient>

export async function saveUtilityRates(
  supabase: SupabaseClient,
  rates: UtilityRate[]
): Promise<void> {
  for (const utility of rates) {
    const calculation_config =
      utility.billing_type === "per_unit"
        ? { rate_per_unit: utility.rate_per_unit, split_by: utility.split_by }
        : { default_amount: utility.flat_amount, split_by: utility.split_by }

    const { error } = await supabase
      .from("charge_types")
      .update({ calculation_config })
      .eq("id", utility.id)

    if (error) throw error
  }
}
