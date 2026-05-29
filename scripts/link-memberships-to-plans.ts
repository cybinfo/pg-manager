/**
 * Link library_memberships to library_plans by matching plan_name.
 *
 * Many memberships were created before plans were set up, leaving plan_id = NULL.
 * This script matches denormalized plan_name → plans.name and sets plan_id.
 *
 * Usage:
 *   npx tsx scripts/link-memberships-to-plans.ts
 *
 * Safe to re-run — skips memberships that already have plan_id set.
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const LIBRARY_ID = "3f977569-95a0-4fa4-a383-b9ccafecef40"

async function run() {
  // 1. Load all plans for NGH workspace
  const { data: plans, error: plansErr } = await supabase
    .from("library_plans")
    .select("id, name")
    .is("deleted_at", null)

  if (plansErr || !plans?.length) {
    console.error("No plans found:", plansErr?.message || "empty")
    process.exit(1)
  }

  console.log(`Found ${plans.length} plans:`)
  plans.forEach((p) => console.log(`  [${p.id}] ${p.name}`))

  // Build case-insensitive name → id map
  const planMap = new Map<string, string>()
  plans.forEach((p) => planMap.set(p.name.toLowerCase().trim(), p.id))

  // 2. Load all memberships without plan_id
  const { data: memberships, error: memErr } = await supabase
    .from("library_memberships")
    .select("id, plan_name, plan_id")
    .is("plan_id", null)
    .is("deleted_at", null)
    .range(0, 99999)

  if (memErr) {
    console.error("Failed to load memberships:", memErr.message)
    process.exit(1)
  }

  console.log(`\nMemberships without plan_id: ${memberships?.length || 0}`)

  if (!memberships?.length) {
    console.log("Nothing to link — all memberships already have plan_id.")
    return
  }

  // 3. Group by plan_name for matching
  let linked = 0
  let unmatched = 0
  const unmatchedNames = new Set<string>()

  for (const mem of memberships) {
    const key = (mem.plan_name || "").toLowerCase().trim()
    const planId = planMap.get(key)

    if (!planId) {
      unmatched++
      if (mem.plan_name) unmatchedNames.add(mem.plan_name)
      continue
    }

    const { error } = await supabase
      .from("library_memberships")
      .update({ plan_id: planId })
      .eq("id", mem.id)

    if (error) {
      console.error(`Failed to update membership ${mem.id}:`, error.message)
    } else {
      linked++
    }
  }

  console.log(`\nResults:`)
  console.log(`  Linked:    ${linked}`)
  console.log(`  Unmatched: ${unmatched}`)

  if (unmatchedNames.size > 0) {
    console.log(`\nUnmatched plan names (check spelling):`)
    unmatchedNames.forEach((name) => console.log(`  "${name}"`))
  }

  console.log("\nDone.")
}

run().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
