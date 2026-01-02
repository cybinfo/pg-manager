/**
 * Demo Owner Seed Script
 *
 * Creates a demo owner account with sample masked data for demonstration purposes.
 *
 * Usage:
 *   npx ts-node scripts/seed-demo-owner.ts
 *
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin operations
 */

import { createClient } from "@supabase/supabase-js"

// Demo data configuration
const DEMO_EMAIL = "demo@managekar.com"
const DEMO_PASSWORD = "demo123"
const DEMO_OWNER_NAME = "Demo User"
const DEMO_BUSINESS_NAME = "Sunrise PG Accommodations"
const DEMO_PHONE = "+91 98765 43210"

// Sample property names
const PROPERTIES = [
  { name: "Sunrise Boys PG", type: "boys_pg", address: "123 MG Road, Bangalore 560001" },
  { name: "Sunshine Girls Hostel", type: "girls_pg", address: "456 Brigade Road, Bangalore 560025" },
]

// Sample room configurations
const ROOM_CONFIGS = [
  { type: "single", capacity: 1, rent: 8000, deposit: 16000 },
  { type: "double", capacity: 2, rent: 6000, deposit: 12000 },
  { type: "triple", capacity: 3, rent: 5000, deposit: 10000 },
]

// Sample tenant names (will be partially masked)
const TENANT_NAMES = [
  "Rahul Sharma",
  "Priya Patel",
  "Amit Kumar",
  "Sneha Reddy",
  "Vikram Singh",
  "Anjali Gupta",
  "Karthik Nair",
  "Meera Iyer",
  "Rohit Verma",
  "Divya Menon",
]

async function seedDemoOwner() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log("Starting demo owner seed...")

  try {
    // 1. Check if demo user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const demoUser = existingUser?.users?.find((u) => u.email === DEMO_EMAIL)

    let userId: string

    if (demoUser) {
      console.log("Demo user already exists, using existing account...")
      userId = demoUser.id

      // Reset password
      await supabase.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
      })
    } else {
      // Create new demo user
      console.log("Creating demo user...")
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: DEMO_OWNER_NAME,
        },
      })

      if (userError) {
        throw new Error(`Failed to create demo user: ${userError.message}`)
      }

      userId = newUser.user.id
    }

    // 2. Create or update owner record
    console.log("Setting up owner record...")
    const { error: ownerError } = await supabase.from("owners").upsert({
      id: userId,
      user_id: userId,
      name: DEMO_OWNER_NAME,
      email: DEMO_EMAIL,
      phone: DEMO_PHONE,
      business_name: DEMO_BUSINESS_NAME,
      is_active: true,
    })

    if (ownerError) {
      console.error("Owner error:", ownerError)
    }

    // 3. Create workspace if not exists
    console.log("Setting up workspace...")
    let workspaceId: string

    const { data: existingWorkspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_user_id", userId)
      .single()

    if (existingWorkspace) {
      workspaceId = existingWorkspace.id
    } else {
      const { data: newWorkspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: DEMO_BUSINESS_NAME,
          slug: "demo-pg",
          type: "pg_manager",
          owner_user_id: userId,
          is_active: true,
        })
        .select()
        .single()

      if (workspaceError) {
        console.error("Workspace error:", workspaceError)
        throw new Error(`Failed to create workspace: ${workspaceError.message}`)
      }

      workspaceId = newWorkspace.id
    }

    // 4. Create user profile
    console.log("Setting up user profile...")
    await supabase.from("user_profiles").upsert({
      user_id: userId,
      name: DEMO_OWNER_NAME,
      email: DEMO_EMAIL,
      phone: DEMO_PHONE,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })

    // 5. Create user context (owner)
    console.log("Setting up user context...")
    await supabase.from("user_contexts").upsert({
      user_id: userId,
      workspace_id: workspaceId,
      context_type: "owner",
      is_active: true,
      is_default: true,
    })

    // 6. Create owner config
    console.log("Setting up owner config...")
    await supabase.from("owner_config").upsert({
      owner_id: userId,
      default_notice_period: 30,
      default_rent_due_day: 5,
      default_grace_period: 5,
    })

    // 7. Create demo properties
    console.log("Creating demo properties...")
    const propertyIds: string[] = []

    for (const prop of PROPERTIES) {
      const { data: property, error } = await supabase
        .from("properties")
        .upsert({
          owner_id: userId,
          workspace_id: workspaceId,
          name: prop.name,
          type: prop.type,
          address: prop.address,
          status: "active",
        }, { onConflict: "owner_id,name" })
        .select()
        .single()

      if (property) {
        propertyIds.push(property.id)
      } else if (error) {
        // Try to get existing property
        const { data: existing } = await supabase
          .from("properties")
          .select("id")
          .eq("owner_id", userId)
          .eq("name", prop.name)
          .single()

        if (existing) {
          propertyIds.push(existing.id)
        }
      }
    }

    // 8. Create demo rooms
    console.log("Creating demo rooms...")
    const roomIds: string[] = []
    let roomNumber = 100

    for (const propertyId of propertyIds) {
      for (const config of ROOM_CONFIGS) {
        for (let i = 0; i < 2; i++) {
          roomNumber++
          const { data: room } = await supabase
            .from("rooms")
            .upsert({
              owner_id: userId,
              property_id: propertyId,
              room_number: String(roomNumber),
              room_type: config.type,
              capacity: config.capacity,
              monthly_rent: config.rent,
              security_deposit: config.deposit,
              status: "available",
              current_occupancy: 0,
            }, { onConflict: "property_id,room_number" })
            .select()
            .single()

          if (room) {
            roomIds.push(room.id)
          }
        }
      }
    }

    // 9. Create demo tenants
    console.log("Creating demo tenants...")
    const tenantIds: string[] = []

    for (let i = 0; i < Math.min(TENANT_NAMES.length, roomIds.length); i++) {
      const name = TENANT_NAMES[i]
      const roomId = roomIds[i]
      const propertyId = propertyIds[i % propertyIds.length]

      // Get room details
      const { data: room } = await supabase
        .from("rooms")
        .select("monthly_rent, security_deposit")
        .eq("id", roomId)
        .single()

      const { data: tenant } = await supabase
        .from("tenants")
        .upsert({
          owner_id: userId,
          workspace_id: workspaceId,
          property_id: propertyId,
          room_id: roomId,
          name: name,
          email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
          phone: `+91 ${9000000000 + i}`,
          status: "active",
          monthly_rent: room?.monthly_rent || 6000,
          security_deposit: room?.security_deposit || 12000,
          check_in_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        }, { onConflict: "owner_id,email" })
        .select()
        .single()

      if (tenant) {
        tenantIds.push(tenant.id)

        // Update room occupancy
        await supabase
          .from("rooms")
          .update({
            current_occupancy: 1,
            status: "partially_occupied",
          })
          .eq("id", roomId)
      }
    }

    // 10. Create some demo bills
    console.log("Creating demo bills...")
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric" })

    for (let i = 0; i < Math.min(5, tenantIds.length); i++) {
      const tenantId = tenantIds[i]

      // Get tenant details
      const { data: tenant } = await supabase
        .from("tenants")
        .select("property_id, monthly_rent")
        .eq("id", tenantId)
        .single()

      if (!tenant) continue

      const billNumber = `INV-2026-${String(i + 1).padStart(4, "0")}`
      const billDate = new Date()
      const dueDate = new Date(billDate)
      dueDate.setDate(dueDate.getDate() + 5)

      await supabase.from("bills").upsert({
        owner_id: userId,
        tenant_id: tenantId,
        property_id: tenant.property_id,
        bill_number: billNumber,
        bill_date: billDate.toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        for_month: currentMonth,
        subtotal: tenant.monthly_rent,
        total_amount: tenant.monthly_rent,
        balance_due: tenant.monthly_rent,
        status: i < 2 ? "paid" : "pending",
        line_items: [
          { type: "Rent", description: `Monthly Rent - ${currentMonth}`, amount: tenant.monthly_rent },
        ],
      }, { onConflict: "owner_id,bill_number" })
    }

    // 11. Create some demo payments
    console.log("Creating demo payments...")
    for (let i = 0; i < 2; i++) {
      const tenantId = tenantIds[i]

      const { data: tenant } = await supabase
        .from("tenants")
        .select("property_id, monthly_rent")
        .eq("id", tenantId)
        .single()

      const { data: bill } = await supabase
        .from("bills")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .single()

      if (!tenant || !bill) continue

      const receiptNumber = `RCP-2026-${String(i + 1).padStart(4, "0")}`

      await supabase.from("payments").upsert({
        owner_id: userId,
        tenant_id: tenantId,
        property_id: tenant.property_id,
        bill_id: bill.id,
        amount: tenant.monthly_rent,
        payment_method: i === 0 ? "upi" : "cash",
        payment_date: new Date().toISOString().split("T")[0],
        receipt_number: receiptNumber,
        status: "completed",
        notes: "Demo payment",
      }, { onConflict: "owner_id,receipt_number" })
    }

    console.log("\n========================================")
    console.log("Demo owner seeded successfully!")
    console.log("========================================")
    console.log(`Email: ${DEMO_EMAIL}`)
    console.log(`Password: ${DEMO_PASSWORD}`)
    console.log(`Properties: ${propertyIds.length}`)
    console.log(`Rooms: ${roomIds.length}`)
    console.log(`Tenants: ${tenantIds.length}`)
    console.log("========================================\n")

  } catch (error) {
    console.error("Error seeding demo owner:", error)
    process.exit(1)
  }
}

// Run the seed
seedDemoOwner()
