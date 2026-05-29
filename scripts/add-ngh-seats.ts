/**
 * Add 50 library seats for New Green High (NGH) Library.
 *
 * Per-visit model — seats track total capacity, no fixed member assignments.
 * Library ID: 3f977569-95a0-4fa4-a383-b9ccafecef40
 *
 * Usage:
 *   npx tsx scripts/add-ngh-seats.ts
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
const OWNER_ID = "ffaaa66a-91ae-43c8-8c34-9d4ea1624628"
const TOTAL_SEATS = 50

async function run() {
  // 1. Get workspace_id and library details
  const { data: library, error: libErr } = await supabase
    .from("libraries")
    .select("id, name, workspace_id")
    .eq("id", LIBRARY_ID)
    .single()

  if (libErr || !library) {
    console.error("Library not found:", libErr?.message)
    process.exit(1)
  }

  console.log(`Library: ${library.name} (workspace: ${library.workspace_id})`)
  const workspaceId = library.workspace_id

  // 2. Get or create section
  const { data: sections } = await supabase
    .from("library_sections")
    .select("id, name, total_seats")
    .eq("library_id", LIBRARY_ID)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  let sectionId: string

  if (sections && sections.length > 0) {
    const section = sections[0]
    console.log(`Using existing section: ${section.name} (${section.id})`)
    sectionId = section.id

    // Update total_seats if lower than what we're adding
    if ((section.total_seats || 0) < TOTAL_SEATS) {
      await supabase
        .from("library_sections")
        .update({ total_seats: TOTAL_SEATS })
        .eq("id", sectionId)
      console.log(`Updated section total_seats to ${TOTAL_SEATS}`)
    }
  } else {
    // Create default section
    const { data: newSection, error: secErr } = await supabase
      .from("library_sections")
      .insert({
        owner_id: OWNER_ID,
        workspace_id: workspaceId,
        library_id: LIBRARY_ID,
        name: "Main Hall",
        section_number: "A",
        floor: 0,
        total_seats: TOTAL_SEATS,
        occupied_seats: 0,
        is_ac: false,
        has_power_outlets: true,
        is_active: true,
        created_by: OWNER_ID,
      })
      .select("id, name")
      .single()

    if (secErr || !newSection) {
      console.error("Failed to create section:", secErr?.message)
      process.exit(1)
    }

    console.log(`Created section: ${newSection.name} (${newSection.id})`)
    sectionId = newSection.id
  }

  // 3. Check existing seats
  const { count: existingCount } = await supabase
    .from("library_seats")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .is("deleted_at", null)

  console.log(`Existing seats in section: ${existingCount || 0}`)

  if ((existingCount || 0) >= TOTAL_SEATS) {
    console.log(`Already has ${existingCount} seats — nothing to add.`)
    return
  }

  const toCreate = TOTAL_SEATS - (existingCount || 0)
  const startIndex = (existingCount || 0) + 1

  // 4. Create seats
  const seats = []
  for (let i = startIndex; i <= TOTAL_SEATS; i++) {
    const num = String(i).padStart(3, "0")
    seats.push({
      owner_id: OWNER_ID,
      workspace_id: workspaceId,
      section_id: sectionId,
      seat_number: `S-${num}`,
      row_number: "A",
      has_power_outlet: true,
      has_lamp: false,
      is_window_seat: false,
      status: "available",
      created_by: OWNER_ID,
    })
  }

  const { error: insertErr } = await supabase.from("library_seats").insert(seats)

  if (insertErr) {
    console.error("Failed to insert seats:", insertErr.message)
    process.exit(1)
  }

  console.log(`Created ${toCreate} seats (S-${String(startIndex).padStart(3, "0")} to S-${String(TOTAL_SEATS).padStart(3, "0")})`)
  console.log("Done.")
}

run().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
