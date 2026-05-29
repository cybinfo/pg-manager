import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PLAN_ID = "e89c5b49-9d01-4179-b892-05bb8ff787bd"

async function run() {
  const { data, error } = await supabase
    .from("library_memberships")
    .update({ plan_id: PLAN_ID })
    .is("plan_id", null)
    .eq("plan_name", "14 Hours")
    .is("deleted_at", null)
    .select("id")

  if (error) { console.error(error.message); process.exit(1) }
  console.log(`Fixed ${data?.length} memberships → 14 Hours (Full Day)`)
}

run()
