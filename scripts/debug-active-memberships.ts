import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  // Get distinct statuses in library_memberships
  const { data: statuses } = await supabase
    .from("library_memberships")
    .select("status")
    .is("deleted_at", null)
    .limit(5000)

  const counts: Record<string, number> = {}
  statuses?.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1 })
  console.log("Membership status distribution:", JSON.stringify(counts, null, 2))

  // Check recent memberships (for active members)
  const { data: recent } = await supabase
    .from("library_memberships")
    .select("id, plan_id, status, start_date, end_date, member_id")
    .order("start_date", { ascending: false })
    .limit(25)

  console.log("\nMost recent memberships:")
  recent?.forEach(m => console.log(`  start=${m.start_date} end=${m.end_date} status=${m.status} member=${m.member_id?.slice(-8)}`))

  // Check active library_members and their current memberships
  const { data: activeMembers } = await supabase
    .from("library_members")
    .select("id, name, member_code, status, current_subscription_id")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(5)

  console.log("\nActive members (first 5):")
  for (const m of (activeMembers || [])) {
    const { data: ms } = await supabase
      .from("library_memberships")
      .select("id, status, start_date, end_date")
      .eq("member_id", m.id)
      .order("start_date", { ascending: false })
      .limit(2)
    console.log(`  ${m.member_code} ${m.name}: current_sub=${m.current_subscription_id?.slice(-8)} memberships=${ms?.map(x => x.status+'@'+x.end_date?.slice(0,10)).join(', ')}`)
  }
}

run()
