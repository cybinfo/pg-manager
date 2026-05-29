/**
 * Close all open attendance records from before today.
 *
 * Historical migration data has check-in records without check-out.
 * These block members from checking in via the scan system and cause
 * incorrect "Currently In" counts.
 *
 * Sets check_out_time = check_in_time (0 hours) for all open records
 * where attendance_date < today. Safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/close-old-attendance.ts
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

const today = new Date().toISOString().split("T")[0]

async function run() {
  // 1. Fetch all open attendance records from before today
  const { data: records, error: fetchErr } = await supabase
    .from("library_attendance")
    .select("id, member_id, check_in_time, attendance_date")
    .is("check_out_time", null)
    .is("deleted_at", null)
    .lt("attendance_date", today)

  if (fetchErr) {
    console.error("Failed to fetch attendance records:", fetchErr.message)
    process.exit(1)
  }

  console.log(`Open attendance records from before ${today}: ${records?.length || 0}`)

  if (!records?.length) {
    console.log("Nothing to close.")
    return
  }

  // 2. Close each record by setting check_out_time = check_in_time (0 hours)
  let closed = 0
  let failed = 0

  for (const record of records) {
    const { error: updateErr } = await supabase
      .from("library_attendance")
      .update({
        check_out_time: record.check_in_time,
        hours_spent: 0,
      })
      .eq("id", record.id)

    if (updateErr) {
      console.error(`  Failed to close record ${record.id}: ${updateErr.message}`)
      failed++
    } else {
      closed++
    }
  }

  console.log(`\nResults:`)
  console.log(`  Closed: ${closed}`)
  console.log(`  Failed: ${failed}`)
  console.log("\nDone.")
}

run().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
