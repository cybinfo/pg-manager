/**
 * Library Data Migration Script
 *
 * Migrates data from Google Sheets CSV exports to ManageKar Supabase database.
 * Source: LibraryMgmt AppSheet app (14 sheets, 3+ years of data)
 * Target: ManageKar library module tables
 *
 * Usage:
 *   npx tsx scripts/migrate-library-data.ts
 *
 * Prerequisites:
 *   - CSV files downloaded to /tmp/library_migration/
 *   - .env.local with SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
 *   - Target user (newgreenhigh@gmail.com) must exist in auth.users
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { parse } from "csv-parse/sync"
import { config } from "dotenv"

// Load env
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

const CSV_DIR = "/tmp/library_migration"

// ============================================
// CSV Parsing Helpers
// ============================================

function readCSVPositional(filename: string, columnNames: string[]): Record<string, string>[] {
  const raw = readFileSync(`${CSV_DIR}/${filename}`, "utf-8")
  const lines = raw.split("\n")

  // Skip the first flattened header row, parse data rows
  const dataLines = lines.slice(1).filter((l) => l.trim())
  if (dataLines.length === 0) return []

  return dataLines.map((line) => {
    const values: string[][] = parse(line, { relax_column_count: true })
    const row = values[0] || []
    const record: Record<string, string> = {}
    columnNames.forEach((col, idx) => {
      record[col] = (row[idx] || "").trim()
    })
    return record
  })
}

// ============================================
// Date Parsing Helpers
// ============================================

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") return null
  const str = dateStr.trim()

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // DD/MM/YYYY HH:MM:SS
  const dtMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s/)
  if (dtMatch) {
    const [, d, m, y] = dtMatch
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // Already ISO
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.split("T")[0]

  return null
}

function parseDateTime(dtStr: string): string | null {
  if (!dtStr || dtStr === "null") return null
  const str = dtStr.trim()

  // DD/MM/YYYY HH:MM:SS
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/)
  if (match) {
    const [, d, m, y, h, min, s] = match
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${s}+05:30`
  }

  // DD/MM/YYYY HH:MM:00 format
  const match2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?$/)
  if (match2) {
    const [, d, m, y, h, min, s = "00"] = match2
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${s}+05:30`
  }

  if (str.match(/^\d{4}-/)) return str

  return null
}

// ============================================
// Main Migration
// ============================================

async function migrate() {
  console.log("🚀 Starting Library Data Migration...")
  console.log(`   Source: ${CSV_DIR}`)
  console.log(`   Target: ${SUPABASE_URL}`)
  console.log("")

  // ── Step 0: Find or create the owner user ──
  const CLIENT_EMAIL = "newgreenhigh@gmail.com"

  const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) {
    console.error("Failed to list users:", userError)
    process.exit(1)
  }

  const owner = userData.users.find((u) => u.email === CLIENT_EMAIL)
  if (!owner) {
    console.error(`User ${CLIENT_EMAIL} not found in auth.users. They must sign up first.`)
    process.exit(1)
  }

  const ownerId = owner.id
  console.log(`✓ Owner: ${CLIENT_EMAIL} (${ownerId})`)

  // ── Step 0b: Find or create workspace ──
  const { data: existingWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", ownerId)
    .single()

  let workspaceId = existingWorkspace?.id

  if (!workspaceId) {
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ owner_user_id: ownerId, name: "New Green High Library" })
      .select("id")
      .single()

    if (wsErr || !ws) {
      console.error("Failed to create workspace:", wsErr)
      process.exit(1)
    }
    workspaceId = ws.id
    console.log(`✓ Created workspace: ${workspaceId}`)
  } else {
    console.log(`✓ Workspace: ${workspaceId}`)
  }

  // ── Step 0c: Create or find library ──
  const { data: existingLibrary } = await supabase
    .from("libraries")
    .select("id")
    .eq("owner_id", ownerId)
    .limit(1)
    .single()

  let libraryId = existingLibrary?.id

  if (!libraryId) {
    const { data: lib, error: libErr } = await supabase
      .from("libraries")
      .insert({
        owner_id: ownerId,
        workspace_id: workspaceId,
        name: "New Green High Library",
        code: "NGH",
        state: "Delhi",
        is_active: true,
        total_sections: 1,
        total_seats: 50,
        occupied_seats: 0,
        has_ac: true,
        has_wifi: true,
        has_lockers: true,
        has_parking: false,
        settings: { time_slots: ["Morning", "Evening", "Night", "24 Hours"], default_hours_per_month: 270 },
        created_by: ownerId,
      })
      .select("id")
      .single()

    if (libErr || !lib) {
      console.error("Failed to create library:", libErr)
      process.exit(1)
    }
    libraryId = lib.id
    console.log(`✓ Created library: New Green High (${libraryId})`)
  } else {
    console.log(`✓ Library: ${libraryId}`)
  }

  // ── Step 0d: Clean up any existing migrated data for this owner ──
  console.log("\n🧹 Cleaning up existing data for this owner...")

  // Break circular FK: clear locker_id on members and current_member_id on lockers first
  await supabase
    .from("library_members")
    .update({ locker_id: null, current_subscription_id: null, assigned_seat_id: null })
    .eq("owner_id", ownerId)
  await supabase
    .from("library_lockers")
    .update({ current_member_id: null })
    .eq("owner_id", ownerId)
  console.log("  ✓ Cleared circular FKs")

  // Delete in order of dependencies (children first)
  const cleanupTables = [
    "library_member_status_log",
    "library_locker_assignments",
    "library_attendance",
    "library_payments",
    "library_memberships",
    "library_members",
    "library_lockers",
  ]

  for (const table of cleanupTables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("owner_id", ownerId)

    if (error) {
      console.warn(`  Warning: cleanup ${table}: ${error.message}`)
    } else {
      console.log(`  ✓ Cleared ${table}`)
    }
  }

  // Clean up people records created for this owner's library members
  const { error: peopleCleanErr } = await supabase
    .from("people")
    .delete()
    .eq("owner_id", ownerId)
    .contains("tags", ["library_member"])

  if (peopleCleanErr) {
    console.warn(`  Warning: cleanup people: ${peopleCleanErr.message}`)
  } else {
    console.log("  ✓ Cleared people (library_member tagged)")
  }

  // ── Step 1: Load all CSVs ──
  console.log("\n📂 Loading CSV data...")

  // Helper to read CSV with proper column headers and normalize to our field names
  function readNamed(filename: string, columnMap: Record<string, string>): Record<string, string>[] {
    const raw = readFileSync(`${CSV_DIR}/${filename}`, "utf-8")
    const rows = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true })
    return rows.map((row: Record<string, string>) => {
      const record: Record<string, string> = {}
      for (const [ourKey, csvKey] of Object.entries(columnMap)) {
        record[ourKey] = (row[csvKey] || "").trim()
      }
      return record
    })
  }

  // Users CSV uses the export format (proper headers, all rows)
  const usersRaw = readFileSync(`${CSV_DIR}/users_export.csv`, "utf-8")
  const users = parse(usersRaw, { columns: true, skip_empty_lines: true, relax_column_count: true }).map((row: Record<string, string>) => ({
    user_id: row["User ID"]?.trim(),
    full_name: row["Full Name"]?.trim(),
    gender: row["Gender"]?.trim(),
    father_name: row["fatherName"]?.trim(),
    profile_image: row["userProfileImage"]?.trim(),
    add_datetime: row["addDatetime"]?.trim(),
    added_by: row["addedBy"]?.trim(),
  })).filter((u: Record<string, string>) => u.user_id && u.full_name)
  console.log(`  Users: ${users.length}`)

  const subscriptions = readNamed("Library_Payment_Sheet.csv", {
    payment_id: "Payment ID", user_id: "User ID", start_date: "Start Date",
    end_date: "End Date", hours: "Hours", price: "Price", add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Subscriptions: ${subscriptions.length}`)

  const paymentDetails = readNamed("Payment_Details.csv", {
    payment_detail_id: "Payment Detail ID", payment_id: "Payment ID",
    amount_received: "Amount Received", mop: "MOP", dop: "DOP",
    add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Payment Details: ${paymentDetails.length}`)

  const attendanceRecords = readNamed("attendance.csv", {
    attendance_id: "attendaceId", user_id: "userId", in_time: "in", out_time: "out",
    add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Attendance: ${attendanceRecords.length}`)

  const lockers = readNamed("lockerList.csv", {
    locker_booking_id: "lockerBookingId", user_id: "userId", locker_number: "lockerNumber",
    security: "security", return_key: "returnKey", security_returned: "securityReturned",
    add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Lockers: ${lockers.length}`)

  const leftUsers = readNamed("leftUsers.csv", {
    left_user_id: "leftUserId", user_id: "userId", left_date: "leftDate",
    add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Left Users: ${leftUsers.length}`)

  const contacts = readNamed("userContactNumberInfoList.csv", {
    contact_id: "userContactNumberId", user_id: "userId", number_type: "numberType",
    contact_number: "contactNumber", is_primary: "isPrimaryNumber", is_whatsapp: "isWhatsappNumber",
    add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Contacts: ${contacts.length}`)

  const emails = readNamed("userEmailList.csv", {
    email_id: "userEmailListId", user_id: "userId", email: "emailId",
    is_primary: "isPrimaryEmailId", add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Emails: ${emails.length}`)

  const fatherContacts = readNamed("userFatherContactInfoList.csv", {
    father_contact_id: "userFatherContactId", user_id: "userId", number_type: "numberType",
    contact_number: "contactNumber", is_primary: "isPrimaryNumber", is_whatsapp: "isWhatsappNumber",
    add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Father Contacts: ${fatherContacts.length}`)

  const idProofs = readNamed("userIdProofList.csv", {
    id_proof_id: "userIdProofId", user_id: "userId", id_proof_type: "idProofType",
    id_number: "idNumber", id_image: "idImage", add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  ID Proofs: ${idProofs.length}`)

  const addresses = readNamed("User_Address_List.csv", {
    address_id: "userAddressId", user_id: "userId", address_type: "addressType",
    map_address: "mapAddress", address: "address", landmark: "landmark",
    pincode: "areaPinCode", area_name: "areaName", add_datetime: "addDatetime", added_by: "addedBy",
  })
  console.log(`  Addresses: ${addresses.length}`)

  const timingsRaw = readFileSync(`${CSV_DIR}/gid_1595344077.csv`, "utf-8")
  const timingsData = parse(timingsRaw, { columns: true, skip_empty_lines: true, relax_column_count: true })
  console.log(`  Timings: ${timingsData.length}`)

  // ── Step 2: Build user lookup maps ──
  console.log("\n🔄 Building lookup maps...")

  // Map old user_id → contact info
  const userPhones = new Map<string, { number: string; type: string; is_whatsapp: boolean; is_primary: boolean }[]>()
  for (const c of contacts) {
    if (!c.user_id || !c.contact_number) continue
    if (!userPhones.has(c.user_id)) userPhones.set(c.user_id, [])
    userPhones.get(c.user_id)!.push({
      number: c.contact_number,
      type: (c.number_type || "personal").toLowerCase(),
      is_whatsapp: c.is_whatsapp === "TRUE",
      is_primary: c.is_primary === "TRUE",
    })
  }

  const userEmails = new Map<string, string>()
  for (const e of emails) {
    if (!e.user_id || !e.email) continue
    if (e.is_primary === "TRUE" || !userEmails.has(e.user_id)) {
      userEmails.set(e.user_id, e.email)
    }
  }

  const userFathers = new Map<string, { name: string; phone: string }[]>()
  for (const f of fatherContacts) {
    if (!f.user_id || !f.contact_number) continue
    if (!userFathers.has(f.user_id)) userFathers.set(f.user_id, [])
    const user = users.find((u) => u.user_id === f.user_id)
    userFathers.get(f.user_id)!.push({
      name: user?.father_name || "Father",
      phone: f.contact_number,
    })
  }

  const userIdProofs = new Map<string, { type: string; number: string }[]>()
  for (const p of idProofs) {
    if (!p.user_id || !p.id_number) continue
    if (!userIdProofs.has(p.user_id)) userIdProofs.set(p.user_id, [])
    userIdProofs.get(p.user_id)!.push({
      type: p.id_proof_type?.toLowerCase().includes("aadhar") ? "aadhaar" : p.id_proof_type || "other",
      number: p.id_number,
    })
  }

  const userAddresses = new Map<string, Record<string, string>>()
  for (const a of addresses) {
    if (!a.user_id) continue
    userAddresses.set(a.user_id, a)
  }

  // Map subscription payment_id → timings (fromTime/toTime)
  const subTimings = new Map<string, { fromTime: string; toTime: string }[]>()
  for (const t of timingsData) {
    const pid = t["paymentId"]?.trim()
    if (!pid || !t["fromTime"]) continue
    if (!subTimings.has(pid)) subTimings.set(pid, [])
    subTimings.get(pid)!.push({
      fromTime: t["fromTime"]?.trim(),
      toTime: t["toTime"]?.trim(),
    })
  }

  // Derive slot from fromTime
  function deriveSlot(fromTime: string): string {
    if (!fromTime) return "Morning"
    const hour = parseInt(fromTime.split(":")[0]) || 0
    if (hour >= 5 && hour < 14) return "Morning"
    if (hour >= 14 && hour < 21) return "Evening"
    return "Night"
  }

  // Get user's preferred slot from their latest subscription's timing
  function getUserSlot(userId: string): string {
    // Find latest subscription for this user
    const userSubs = subscriptions
      .filter((s) => s.user_id === userId && s.payment_id)
      .sort((a, b) => {
        const da = parseDate(a.start_date) || ""
        const db = parseDate(b.start_date) || ""
        return db.localeCompare(da)
      })

    for (const sub of userSubs) {
      const timings = subTimings.get(sub.payment_id)
      if (timings && timings.length > 0) {
        return deriveSlot(timings[0].fromTime)
      }
    }
    return "Morning"
  }

  // Get timing description for a subscription (legacy format)
  function getTimingDesc(paymentId: string): string | null {
    const timings = subTimings.get(paymentId)
    if (!timings || timings.length === 0) return null
    return timings.map((t) => `${t.fromTime.slice(0, 5)}-${t.toTime.slice(0, 5)}`).join(", ")
  }

  // Build JSON time_slot from timing data (new multi-slot format)
  function buildTimeSlotJson(paymentId: string): string | null {
    const timings = subTimings.get(paymentId)
    if (!timings || timings.length === 0) return null
    const slots = timings
      .filter((t) => t.fromTime && t.toTime)
      .map((t) => ({
        start: t.fromTime.slice(0, 5), // "HH:MM"
        end: t.toTime.slice(0, 5),
      }))
    if (slots.length === 0) return null
    return JSON.stringify(slots)
  }

  // Check which users are "left" (have a leftUsers record)
  const leftUserIds = new Set(leftUsers.map((l) => l.user_id))

  // Find each user's latest subscription end date
  const userLatestExpiry = new Map<string, string>()
  for (const s of subscriptions) {
    if (!s.user_id || !s.end_date) continue
    const endDate = parseDate(s.end_date)
    if (!endDate) continue
    const current = userLatestExpiry.get(s.user_id)
    if (!current || endDate > current) {
      userLatestExpiry.set(s.user_id, endDate)
    }
  }

  // ── Step 3: Create People + Library Members ──
  console.log("\n👥 Creating people and library members...")

  const userIdToMemberId = new Map<string, string>()
  const userIdToPersonId = new Map<string, string>()

  let memberCount = 0
  const memberYear = new Date().getFullYear()

  const BATCH_SIZE = 50
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    for (const user of batch) {
      if (!user.user_id || !user.full_name) continue

      const primaryPhone = userPhones.get(user.user_id)?.find((p) => p.is_primary)?.number ||
        userPhones.get(user.user_id)?.[0]?.number || null
      const email = userEmails.get(user.user_id) || null
      const addr = userAddresses.get(user.user_id)
      const fathers = userFathers.get(user.user_id) || []
      const proofs = userIdProofs.get(user.user_id) || []
      const phoneNums = userPhones.get(user.user_id) || []

      const gender = user.gender?.toLowerCase()
      const validGender = ["male", "female", "other"].includes(gender) ? gender : null

      // Build emergency_contacts from father contacts
      const emergencyContacts = fathers.map((f) => ({
        name: f.name?.toUpperCase() || "Father",
        phone: f.phone,
        relation: "Father",
      }))

      // Build id_documents (deduplicate by number)
      const seenNumbers = new Set<string>()
      const idDocuments = proofs.filter((p) => {
        if (seenNumbers.has(p.number)) return false
        seenNumbers.add(p.number)
        return true
      }).map((p) => ({
        type: p.type,
        number: p.number,
        verified: false,
      }))

      // Create person
      const { data: person, error: personErr } = await supabase
        .from("people")
        .insert({
          owner_id: ownerId,
          name: user.full_name.toUpperCase(),
          phone: primaryPhone,
          email: email,
          gender: validGender,
          phone_numbers: phoneNums,
          emergency_contacts: emergencyContacts,
          id_documents: idDocuments,
          permanent_address: addr?.address || null,
          permanent_city: addr?.area_name || null,
          permanent_pincode: addr?.pincode || null,
          tags: ["library_member"],
          person_type: "individual",
          source: "migration",
          notes: `AppSheet ID: ${user.user_id}`,
        })
        .select("id")
        .single()

      if (personErr || !person) {
        console.warn(`  Skipping user ${user.user_id} (${user.full_name}): ${personErr?.message}`)
        continue
      }

      userIdToPersonId.set(user.user_id, person.id)

      // Determine member status using SDR logic:
      // Active = has subscription with end_date >= today AND (never left, OR resubscribed after leaving)
      // Inactive = left after last subscription, or subscription expired
      const expiryDate = userLatestExpiry.get(user.user_id)
      const latestLeftDate = (() => {
        const userLeftRecords = leftUsers.filter((l) => l.user_id === user.user_id)
        if (userLeftRecords.length === 0) return null
        return userLeftRecords.reduce((latest: string | null, l) => {
          const d = parseDate(l.left_date)
          return d && (!latest || d > latest) ? d : latest
        }, null as string | null)
      })()

      // Status logic:
      //   active    = subscription valid, member attending
      //   expired   = subscription ended naturally, member may renew
      //   suspended = member explicitly left AND did NOT resubscribe after leaving
      //   cancelled = not used during migration
      //
      // Key rule: if member left on Jan 1 but resubscribed on Feb 1,
      // their latest subscription START date is after leftDate → they came back.
      // Only mark suspended if leftDate is AFTER the latest subscription start date.
      const userSubs = subscriptions.filter((s) => s.user_id === user.user_id)
      const latestSubStartDate = (() => {
        const activeSubs = userSubs
          .map((s) => parseDate(s.start_date))
          .filter((d): d is string => d !== null)
          .sort((a, b) => b.localeCompare(a))
        return activeSubs[0] || null
      })()

      // Did the member resubscribe after leaving?
      const resubscribedAfterLeaving = latestLeftDate && latestSubStartDate
        && new Date(latestSubStartDate) > new Date(latestLeftDate)

      let status: string
      if (!expiryDate) {
        status = "expired" // No subscription ever
      } else if (new Date(expiryDate) >= new Date()) {
        // Subscription still valid
        if (latestLeftDate && !resubscribedAfterLeaving) {
          status = "suspended" // Left and didn't come back
        } else {
          status = "active" // Valid subscription (or came back after leaving)
        }
      } else {
        // Subscription expired
        if (latestLeftDate && !resubscribedAfterLeaving) {
          status = "suspended" // Left and didn't resubscribe after
        } else {
          status = "expired" // Subscription just expired naturally (or came back then expired)
        }
      }

      // Find join date (earliest subscription start date)
      const joinDate = userSubs.length > 0
        ? userSubs.reduce((earliest: string | null, s) => {
          const d = parseDate(s.start_date)
          return d && (!earliest || d < earliest) ? d : earliest
        }, null as string | null)
        : parseDate(user.add_datetime) || new Date().toISOString().split("T")[0]

      // ID proof from first document
      const firstProof = proofs[0]

      memberCount++
      const memberCode = `NGH-${memberYear}-${String(memberCount).padStart(4, "0")}`

      // Derive slot from latest timing data
      const preferredSlot = getUserSlot(user.user_id)

      // Calculate hours from latest active subscription
      const latestActiveSub = userSubs
        .filter((s) => parseDate(s.end_date) && new Date(parseDate(s.end_date)!) >= new Date())
        .sort((a, b) => (parseDate(b.end_date) || "").localeCompare(parseDate(a.end_date) || ""))[0]

      const hoursBalance = latestActiveSub ? (parseInt(latestActiveSub.hours) || 0) : 0

      const { data: member, error: memberErr } = await supabase
        .from("library_members")
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          library_id: libraryId,
          person_id: person.id,
          name: user.full_name.toUpperCase(),
          phone: primaryPhone,
          email: email,
          member_code: memberCode,
          id_proof_type: firstProof?.type || null,
          id_proof_number: firstProof?.number || null,
          status: status,
          join_date: joinDate,
          expiry_date: expiryDate || null,
          hours_balance: hoursBalance,
          hours_used: 0,
          preferred_slot: preferredSlot,
          left_date: (latestLeftDate && !resubscribedAfterLeaving) ? latestLeftDate : null,
          notes: user.father_name ? `Father: ${user.father_name}` : null,
          created_by: ownerId,
        })
        .select("id")
        .single()

      if (memberErr || !member) {
        console.warn(`  Skipping member ${user.user_id}: ${memberErr?.message}`)
        continue
      }

      userIdToMemberId.set(user.user_id, member.id)
    }

    process.stdout.write(`  Members: ${Math.min(i + BATCH_SIZE, users.length)}/${users.length}\r`)
  }

  console.log(`\n✓ Created ${userIdToMemberId.size} members (${userIdToPersonId.size} people)`)

  // ── Step 4: Create Memberships (Subscriptions) ──
  console.log("\n📋 Creating memberships...")

  const oldPaymentIdToMembershipId = new Map<string, string>()
  let membershipCount = 0

  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE)

    for (const sub of batch) {
      const memberId = userIdToMemberId.get(sub.user_id)
      if (!memberId) continue

      const startDate = parseDate(sub.start_date)
      const endDate = parseDate(sub.end_date)
      if (!startDate || !endDate) continue

      const hours = parseInt(sub.hours) || null
      const price = parseInt(sub.price) || 0
      const isExpired = new Date(endDate) < new Date()

      // Get timing info for this subscription — store actual times as JSON
      const timeSlotJson = buildTimeSlotJson(sub.payment_id)
      const subTimingList = subTimings.get(sub.payment_id)
      const subSlot = subTimingList?.length ? deriveSlot(subTimingList[0].fromTime) : "Morning"

      const { data: membership, error: msErr } = await supabase
        .from("library_memberships")
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          member_id: memberId,
          plan_name: hours ? `${hours} Hours` : "Custom",
          hours_included: hours,
          amount: price,
          discount_amount: 0,
          final_amount: price,
          time_slot: timeSlotJson || subSlot,
          start_date: startDate,
          end_date: endDate,
          hours_remaining: hours,
          hours_used: 0,
          status: isExpired ? "expired" : "active",
          created_by: ownerId,
        })
        .select("id")
        .single()

      if (msErr || !membership) {
        if (msErr && membershipCount < 10) console.warn(`  Membership error [${sub.payment_id}] user=${sub.user_id} member=${memberId}: ${msErr.message} | ${msErr.code} | ${msErr.details}`)
        if (!msErr && !membership) console.warn(`  Membership no data [${sub.payment_id}] user=${sub.user_id} member=${memberId}: no error but no data returned`)
        if (msErr) console.warn(`  Membership ERROR [${sub.payment_id}]: ${msErr.message} | code=${msErr.code} | hint=${msErr.hint}`)
        continue
      }

      oldPaymentIdToMembershipId.set(sub.payment_id, membership.id)
      membershipCount++
    }

    process.stdout.write(`  Memberships: ${Math.min(i + BATCH_SIZE, subscriptions.length)}/${subscriptions.length}\r`)
  }

  console.log(`\n✓ Created ${membershipCount} memberships`)

  // ── Step 5: Create Payments ──
  console.log("\n💰 Creating payments...")

  const methodMap: Record<string, string> = {
    "cash": "cash",
    "upi": "upi",
    "google pay": "upi",
    "phonepe": "upi",
    "paytm": "paytm",
    "bank transfer": "bank_transfer",
    "card": "card",
  }

  let paymentCount = 0
  for (let i = 0; i < paymentDetails.length; i += BATCH_SIZE) {
    const batch = paymentDetails.slice(i, i + BATCH_SIZE)

    for (const pd of batch) {
      if (!pd.payment_id || !pd.amount_received) continue

      const membershipId = oldPaymentIdToMembershipId.get(pd.payment_id)
      const sub = subscriptions.find((s) => s.payment_id === pd.payment_id)
      if (!sub) continue

      const memberId = userIdToMemberId.get(sub.user_id)
      if (!memberId) continue

      const amount = parseInt(pd.amount_received) || 0
      if (amount <= 0) continue

      const paymentDate = parseDate(pd.dop) || parseDate(pd.add_datetime) || new Date().toISOString().split("T")[0]
      const method = methodMap[(pd.mop || "cash").toLowerCase()] || "cash"

      paymentCount++
      const receiptNumber = `PYMT-LIB-${paymentCount.toString().padStart(6, "0")}`

      const { error: payErr } = await supabase
        .from("library_payments")
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          member_id: memberId,
          membership_id: membershipId || null,
          receipt_number: receiptNumber,
          payment_date: paymentDate,
          amount: amount,
          payment_type: "subscription",
          payment_method: method,
          status: "completed",
          created_by: ownerId,
        })

      if (payErr) {
        if (paymentCount === 1) console.warn(`  First payment error: ${payErr.message} | ${payErr.code}`)
        paymentCount-- // Undo pre-increment on failure
      }
    }

    process.stdout.write(`  Payments: ${Math.min(i + BATCH_SIZE, paymentDetails.length)}/${paymentDetails.length}\r`)
  }

  console.log(`\n✓ Created ${paymentCount} payments`)

  // ── Step 6: Create Attendance ──
  console.log("\n📅 Creating attendance records...")

  let attendanceCount = 0
  for (let i = 0; i < attendanceRecords.length; i += BATCH_SIZE) {
    const batch = attendanceRecords.slice(i, i + BATCH_SIZE)

    for (const att of batch) {
      const memberId = userIdToMemberId.get(att.user_id)
      if (!memberId) continue

      const checkIn = parseDateTime(att.in_time)
      if (!checkIn) continue

      const checkOut = parseDateTime(att.out_time)
      const attendanceDate = checkIn.split("T")[0]

      // Calculate hours spent
      let hoursSpent: number | null = null
      if (checkIn && checkOut) {
        const inTime = new Date(checkIn)
        const outTime = new Date(checkOut)
        hoursSpent = Math.round(((outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)) * 100) / 100
        if (hoursSpent < 0 || hoursSpent > 24) hoursSpent = null
      }

      const { error: attErr } = await supabase
        .from("library_attendance")
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          member_id: memberId,
          attendance_date: attendanceDate,
          check_in_time: checkIn,
          check_out_time: checkOut,
          hours_spent: hoursSpent,
          created_by: ownerId,
        })

      if (!attErr) attendanceCount++
    }

    process.stdout.write(`  Attendance: ${Math.min(i + BATCH_SIZE, attendanceRecords.length)}/${attendanceRecords.length}\r`)
  }

  console.log(`\n✓ Created ${attendanceCount} attendance records`)

  // ── Step 7: Create Lockers + Assignments ──
  console.log("\n🔐 Creating lockers and assignments...")

  const uniqueLockerNumbers = [...new Set(lockers.map((l) => l.locker_number))].filter(Boolean)
  const lockerNumberToId = new Map<string, string>()

  for (const num of uniqueLockerNumbers) {
    const { data: locker, error: lockErr } = await supabase
      .from("library_lockers")
      .insert({
        owner_id: ownerId,
        workspace_id: workspaceId,
        library_id: libraryId,
        locker_number: num,
        size: "medium",
        floor: 0,
        monthly_rent: 0,
        deposit_amount: 100,
        status: "available",
        created_by: ownerId,
      })
      .select("id")
      .single()

    if (!lockErr && locker) {
      lockerNumberToId.set(num, locker.id)
    }
  }

  console.log(`  ✓ Created ${lockerNumberToId.size} lockers`)

  let assignmentCount = 0
  for (const l of lockers) {
    const memberId = userIdToMemberId.get(l.user_id)
    const lockerId = lockerNumberToId.get(l.locker_number)
    if (!memberId || !lockerId) continue

    const keyReturned = l.return_key === "TRUE"
    const depositReturned = l.security_returned === "TRUE"
    const securityAmount = parseInt(l.security) || 100

    const { error: assignErr } = await supabase
      .from("library_locker_assignments")
      .insert({
        owner_id: ownerId,
        workspace_id: workspaceId,
        locker_id: lockerId,
        member_id: memberId,
        start_date: parseDate(l.add_datetime) || new Date().toISOString().split("T")[0],
        deposit_amount: securityAmount,
        deposit_returned: depositReturned,
        status: keyReturned ? "ended" : "active",
        created_by: ownerId,
      })

    if (!assignErr) {
      assignmentCount++

      // Update locker status if active assignment
      if (!keyReturned) {
        await supabase
          .from("library_lockers")
          .update({ status: "occupied", current_member_id: memberId })
          .eq("id", lockerId)
      }
    }
  }

  console.log(`  ✓ Created ${assignmentCount} locker assignments`)

  // ── Step 8: Create Status Log for Left Users ──
  console.log("\n📊 Creating status log entries for inactive users...")

  let statusLogCount = 0
  for (const left of leftUsers) {
    const memberId = userIdToMemberId.get(left.user_id)
    if (!memberId) continue

    const leftDate = parseDate(left.left_date) || parseDate(left.add_datetime)
    if (!leftDate) continue

    const { error: logErr } = await supabase
      .from("library_member_status_log")
      .insert({
        owner_id: ownerId,
        workspace_id: workspaceId,
        member_id: memberId,
        old_status: "active",
        new_status: "suspended",
        reason: "Marked inactive (migrated from AppSheet)",
        changed_at: leftDate + "T00:00:00+05:30",
        changed_by: ownerId,
        created_by: ownerId,
      })

    if (logErr) {
      if (statusLogCount === 0) console.warn(`  First status log error: ${logErr.message} | ${logErr.code}`)
    } else {
      statusLogCount++
    }
  }

  console.log(`✓ Created ${statusLogCount} status log entries`)

  // ── Step 9: Update member current_subscription_id to latest ──
  console.log("\n🔗 Linking members to latest subscriptions...")

  let linkedCount = 0
  for (const [, memberId] of userIdToMemberId) {
    const { data: latestMembership } = await supabase
      .from("library_memberships")
      .select("id")
      .eq("member_id", memberId)
      .order("end_date", { ascending: false })
      .limit(1)
      .single()

    if (latestMembership) {
      await supabase
        .from("library_members")
        .update({ current_subscription_id: latestMembership.id })
        .eq("id", memberId)
      linkedCount++
    }
  }

  console.log(`✓ Linked ${linkedCount} members to subscriptions`)

  // ── Step 10: Link orphan payments to memberships ──
  console.log("\n🔗 Linking payments to memberships...")

  // Fetch all payments without membership_id for this owner
  const { data: orphanPayments } = await supabase
    .from("library_payments")
    .select("id, member_id, payment_date, amount")
    .eq("owner_id", ownerId)
    .is("membership_id", null)

  let linkPaymentCount = 0
  if (orphanPayments && orphanPayments.length > 0) {
    // Fetch all memberships for this owner (grouped by member)
    const { data: allMemberships } = await supabase
      .from("library_memberships")
      .select("id, member_id, start_date, end_date, final_amount")
      .eq("owner_id", ownerId)
      .order("start_date", { ascending: true })

    if (allMemberships && allMemberships.length > 0) {
      // Build a map of member_id → memberships
      const memberMemberships = new Map<string, typeof allMemberships>()
      for (const ms of allMemberships) {
        if (!memberMemberships.has(ms.member_id)) memberMemberships.set(ms.member_id, [])
        memberMemberships.get(ms.member_id)!.push(ms)
      }

      for (const payment of orphanPayments) {
        const memberships = memberMemberships.get(payment.member_id)
        if (!memberships || memberships.length === 0) continue

        // Find best matching membership:
        // 1. Payment date falls within membership period (start_date to end_date)
        // 2. If multiple matches, prefer one where amount is close to final_amount
        let bestMatch: typeof allMemberships[0] | null = null
        let bestAmountDiff = Infinity

        for (const ms of memberships) {
          const pDate = payment.payment_date
          if (pDate >= ms.start_date && pDate <= ms.end_date) {
            const amountDiff = Math.abs(payment.amount - ms.final_amount)
            if (!bestMatch || amountDiff < bestAmountDiff) {
              bestMatch = ms
              bestAmountDiff = amountDiff
            }
          }
        }

        // If no date-range match, try closest membership by start_date before payment
        if (!bestMatch) {
          for (const ms of [...memberships].reverse()) {
            if (ms.start_date <= payment.payment_date) {
              bestMatch = ms
              break
            }
          }
        }

        if (bestMatch) {
          const { error: linkErr } = await supabase
            .from("library_payments")
            .update({ membership_id: bestMatch.id })
            .eq("id", payment.id)

          if (!linkErr) linkPaymentCount++
        }
      }
    }
  }

  console.log(`✓ Linked ${linkPaymentCount} orphan payments to memberships (of ${orphanPayments?.length || 0} total)`)

  // ── Summary ──
  console.log("\n" + "=".repeat(60))
  console.log("✅ MIGRATION COMPLETE")
  console.log("=".repeat(60))
  console.log(`  People:           ${userIdToPersonId.size}`)
  console.log(`  Library Members:  ${userIdToMemberId.size}`)
  console.log(`  Memberships:      ${membershipCount}`)
  console.log(`  Payments:         ${paymentCount}`)
  console.log(`  Attendance:       ${attendanceCount}`)
  console.log(`  Lockers:          ${lockerNumberToId.size}`)
  console.log(`  Locker Assigns:   ${assignmentCount}`)
  console.log(`  Status Logs:      ${statusLogCount}`)
  console.log(`  Owner:            ${CLIENT_EMAIL}`)
  console.log(`  Library:          New Green High (${libraryId})`)
  console.log("=".repeat(60))
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
