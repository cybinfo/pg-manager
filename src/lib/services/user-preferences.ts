import type { SupabaseClient } from "@supabase/supabase-js"

export async function saveUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: { theme?: string; compact_mode?: boolean; [key: string]: unknown }
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ preferences: prefs })
    .eq("user_id", userId)

  if (error) throw error
}
