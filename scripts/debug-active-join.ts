import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  // Active memberships WITHOUT plan_id
  const { data: noplan } = await supabase
    .from("library_memberships")
    .select("id, member_id, status, plan_id, plan_name, start_date, end_date")
    .eq("status", "active")
    .is("deleted_at", null)
    .is("plan_id", null)
    .limit(25)

  console.log(`Active memberships WITHOUT plan_id: ${noplan?.length}`)
  noplan?.forEach(m => console.log(`  plan_name=${m.plan_name} start=${m.start_date} end=${m.end_date}`))

  // Active memberships WITH plan_id
  const { data: withplan } = await supabase
    .from("library_memberships")
    .select("id, member_id, status, plan_id, plan_name")
    .eq("status", "active")
    .is("deleted_at", null)
    .not("plan_id", "is", null)
    .limit(10)

  console.log(`\nActive memberships WITH plan_id: ${withplan?.length}`)

  // What plan_names do active memberships have?
  const { data: allActive } = await supabase
    .from("library_memberships")
    .select("plan_id, plan_name")
    .eq("status", "active")
    .is("deleted_at", null)

  console.log("\nAll active membership plan_names:")
  allActive?.forEach(m => console.log(`  plan_id=${m.plan_id} plan_name=${m.plan_name}`))
}

run()
