import type { createClient } from "@/lib/supabase/client"

type SupabaseClient = ReturnType<typeof createClient>

export interface SubmitInquiryParams {
  property_id: string
  owner_id: string
  name: string
  phone: string
  email?: string | null
  message?: string | null
  preferred_room_type?: string | null
  expected_move_in?: string | null
}

export async function submitInquiry(
  supabase: SupabaseClient,
  params: SubmitInquiryParams,
): Promise<void> {
  const { error } = await supabase.from("website_inquiries").insert({
    property_id: params.property_id,
    owner_id: params.owner_id,
    name: params.name,
    phone: params.phone,
    email: params.email || null,
    message: params.message || null,
    preferred_room_type: params.preferred_room_type || null,
    expected_move_in: params.expected_move_in || null,
    source: "website",
  })

  if (error) throw error
}
