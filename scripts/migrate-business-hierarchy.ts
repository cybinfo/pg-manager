/**
 * Business Hierarchy Migration Script
 *
 * For each workspace that has existing properties or libraries, this script:
 * 1. Creates 1 Business record (name = first property/library name)
 * 2. For each property → creates a Location, copies address, links property.location_id
 * 3. For each library → creates a Location (or reuses if same address), links library.location_id
 *
 * Run: npx tsx scripts/migrate-business-hierarchy.ts
 * Uses service role key to bypass RLS.
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface Workspace {
  id: string
  owner_user_id: string
  name: string | null
}

interface Property {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  owner_id: string
  workspace_id?: string
  location_id: string | null
}

interface Library {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  owner_id: string
  location_id: string | null
}

async function getOrCreateWorkspaceId(ownerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", ownerId)
    .single()
  return data?.id || null
}

async function migrateWorkspace(workspace: Workspace) {
  const ownerId = workspace.owner_user_id
  console.log(`\n── Workspace: ${workspace.id} (${workspace.name || "unnamed"})`)

  // Get all properties in this workspace
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, city, state, pincode, phone, email, owner_id, location_id")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)

  // Get all libraries in this workspace
  const { data: libraries } = await supabase
    .from("libraries")
    .select("id, name, address, city, state, pincode, phone, email, owner_id, location_id")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)

  const props: Property[] = properties || []
  const libs: Library[] = libraries || []

  if (props.length === 0 && libs.length === 0) {
    console.log("  → No properties or libraries. Skipping.")
    return
  }

  // Skip if all already migrated
  const unmigrated = [
    ...props.filter((p) => !p.location_id),
    ...libs.filter((l) => !l.location_id),
  ]
  if (unmigrated.length === 0) {
    console.log(`  → Already fully migrated (${props.length} properties, ${libs.length} libraries).`)
    return
  }

  // Create 1 Business for this workspace
  const businessName = workspace.name || props[0]?.name || libs[0]?.name || "My Business"
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .insert({
      workspace_id: workspace.id,
      owner_id: ownerId,
      name: businessName,
      is_active: true,
      created_by: null,
    })
    .select("id")
    .single()

  if (bizError || !business) {
    console.error(`  ✗ Failed to create business: ${bizError?.message}`)
    return
  }
  console.log(`  ✓ Created business "${businessName}" (${business.id})`)

  // Migrate each property → 1 Location each
  for (const property of props) {
    if (property.location_id) {
      console.log(`  → Property "${property.name}" already has location_id. Skipping.`)
      continue
    }

    const locationName = property.city
      ? `${property.name} (${property.city})`
      : property.name

    const { data: location, error: locError } = await supabase
      .from("locations")
      .insert({
        business_id: business.id,
        workspace_id: workspace.id,
        owner_id: ownerId,
        name: locationName,
        address: property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        phone: property.phone,
        email: property.email,
        is_active: true,
        is_primary: props.indexOf(property) === 0,
        created_by: null,
      })
      .select("id")
      .single()

    if (locError || !location) {
      console.error(`  ✗ Failed to create location for property "${property.name}": ${locError?.message}`)
      continue
    }

    // Link property to location
    const { error: linkError } = await supabase
      .from("properties")
      .update({ location_id: location.id })
      .eq("id", property.id)

    if (linkError) {
      console.error(`  ✗ Failed to link property "${property.name}" to location: ${linkError.message}`)
    } else {
      console.log(`  ✓ Property "${property.name}" → Location "${locationName}" (${location.id})`)
    }
  }

  // Migrate each library → 1 Location each
  for (const library of libs) {
    if (library.location_id) {
      console.log(`  → Library "${library.name}" already has location_id. Skipping.`)
      continue
    }

    const locationName = library.city
      ? `${library.name} (${library.city})`
      : library.name

    const { data: location, error: locError } = await supabase
      .from("locations")
      .insert({
        business_id: business.id,
        workspace_id: workspace.id,
        owner_id: ownerId,
        name: locationName,
        address: library.address,
        city: library.city,
        state: library.state,
        pincode: library.pincode,
        phone: library.phone,
        email: library.email,
        is_active: true,
        is_primary: false,
        created_by: null,
      })
      .select("id")
      .single()

    if (locError || !location) {
      console.error(`  ✗ Failed to create location for library "${library.name}": ${locError?.message}`)
      continue
    }

    // Link library to location
    const { error: linkError } = await supabase
      .from("libraries")
      .update({ location_id: location.id })
      .eq("id", library.id)

    if (linkError) {
      console.error(`  ✗ Failed to link library "${library.name}" to location: ${linkError.message}`)
    } else {
      console.log(`  ✓ Library "${library.name}" → Location "${locationName}" (${location.id})`)
    }
  }
}

async function run() {
  console.log("Business Hierarchy Migration")
  console.log("============================")

  // Get all workspaces
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, owner_user_id, name")
    .order("created_at")

  if (error || !workspaces) {
    console.error("Failed to fetch workspaces:", error?.message)
    process.exit(1)
  }

  console.log(`Found ${workspaces.length} workspace(s)`)

  for (const workspace of workspaces as Workspace[]) {
    await migrateWorkspace(workspace)
  }

  console.log("\n============================")
  console.log("Migration complete.")
  console.log("\nNext steps:")
  console.log("1. Review the created records in Supabase dashboard")
  console.log("2. Ask owners to enrich their business profiles (GST, logo, legal name)")
  console.log("3. Once all records are verified, location_id can be made NOT NULL")
}

run().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
