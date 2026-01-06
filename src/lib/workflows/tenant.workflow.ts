/**
 * Tenant Lifecycle Workflow
 *
 * Handles complete tenant lifecycle with all cascading effects:
 * 1. Tenant Creation - with room occupancy, initial bill, welcome notification
 * 2. Tenant Update - with audit logging
 * 3. Room Transfer - with occupancy updates, prorated billing
 */

import { createClient } from "@/lib/supabase/client"
import {
  WorkflowDefinition,
  executeWorkflow,
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
  NotificationPayload,
} from "@/lib/services"
import { buildWelcomeNotification, buildBillNotification } from "@/lib/services/notification.service"
import { createAuditEvent } from "@/lib/services/audit.service"
import { formatCurrency } from "@/lib/format"

// ============================================
// Types
// ============================================

export interface TenantCreateInput {
  // Basic info
  name: string
  email?: string
  phone: string
  photo_url?: string
  profile_photo?: string

  // Assignment
  property_id: string
  room_id: string
  bed_id?: string

  // Dates
  check_in_date: string
  agreement_start_date?: string
  agreement_end_date?: string

  // Financial
  monthly_rent: number
  security_deposit?: number
  advance_amount?: number
  maintenance_charge?: number

  // Additional info
  emergency_contact?: string
  id_proof_type?: string
  id_proof_number?: string
  address?: string

  // Options
  generate_initial_bill?: boolean
  send_welcome_notification?: boolean
  send_invitation?: boolean

  // Complex fields (JSONB)
  phones?: Array<{ number: string; type: string; is_primary: boolean }>
  emails?: Array<{ email: string; type: string; is_primary: boolean }>
  addresses?: Array<Record<string, unknown>>
  guardians?: Array<Record<string, unknown>>
  id_documents?: Array<Record<string, unknown>>
}

export interface TenantCreateOutput {
  tenant_id: string
  tenant_stay_id: string | null
  initial_bill_id: string | null
  invitation_sent: boolean
}

export interface RoomTransferInput {
  tenant_id: string
  new_room_id: string
  new_bed_id?: string
  transfer_date: string
  reason?: string
  adjust_rent?: boolean
  new_rent?: number
}

export interface RoomTransferOutput {
  transfer_id: string
  old_room_id: string
  new_room_id: string
  rent_adjusted: boolean
}

// ============================================
// Tenant Creation Workflow
// ============================================

export const tenantCreateWorkflow: WorkflowDefinition<TenantCreateInput, TenantCreateOutput> = {
  name: "tenant_create",

  steps: [
    // Step 1: Validate room capacity
    {
      name: "validate_room",
      execute: async (context, input) => {
        const supabase = createClient()

        const { data: room, error } = await supabase
          .from("rooms")
          .select("id, room_number, total_beds, occupied_beds, status, property:properties(id, name)")
          .eq("id", input.room_id)
          .single()

        if (error || !room) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "Room not found")
          )
        }

        const bedCount = room.total_beds || 1
        const occupiedBeds = room.occupied_beds || 0

        if (occupiedBeds >= bedCount) {
          return createErrorResult(
            createServiceError(ERROR_CODES.ROOM_AT_CAPACITY, "Room is at full capacity")
          )
        }

        return createSuccessResult(room)
      },
    },

    // Step 2: Create tenant record
    {
      name: "create_tenant",
      execute: async (context, input) => {
        const supabase = createClient()

        const tenantData = {
          name: input.name,
          email: input.email || null,
          phone: input.phone,
          photo_url: input.photo_url || null,
          profile_photo: input.profile_photo || null,
          property_id: input.property_id,
          room_id: input.room_id,
          bed_id: input.bed_id || null,
          check_in_date: input.check_in_date,
          agreement_start_date: input.agreement_start_date || input.check_in_date,
          agreement_end_date: input.agreement_end_date || null,
          monthly_rent: input.monthly_rent,
          security_deposit: input.security_deposit || 0,
          advance_amount: input.advance_amount || 0,
          advance_balance: input.advance_amount || 0,
          phone_numbers: input.phones || null,
          emails: input.emails || null,
          addresses: input.addresses || null,
          guardian_contacts: input.guardians || null,
          status: "active",
          owner_id: context.actor_id,
          created_at: new Date().toISOString(),
        }

        const { data: tenant, error } = await supabase
          .from("tenants")
          .insert(tenantData)
          .select()
          .single()

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to create tenant", { error })
          )
        }

        return createSuccessResult(tenant)
      },
      rollback: async (context, input, stepResult) => {
        const supabase = createClient()
        const tenant = stepResult as Record<string, unknown>
        if (tenant?.id) {
          await supabase.from("tenants").delete().eq("id", tenant.id)
        }
      },
    },

    // Step 3: Create tenant_stays record
    {
      name: "create_tenant_stay",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const tenant = previousResults.create_tenant as Record<string, unknown>

        const stayData = {
          owner_id: context.actor_id,
          tenant_id: tenant.id,
          property_id: input.property_id,
          room_id: input.room_id,
          bed_id: input.bed_id || null,
          join_date: input.check_in_date,
          monthly_rent: input.monthly_rent,
          status: "active",
          created_at: new Date().toISOString(),
        }

        const { data: stay, error } = await supabase
          .from("tenant_stays")
          .insert(stayData)
          .select()
          .single()

        if (error) {
          // Don't fail the workflow if tenant_stays table doesn't exist
          console.warn("[TenantCreate] Failed to create tenant_stay:", error)
          return createSuccessResult(null)
        }

        return createSuccessResult(stay)
      },
      optional: true,
    },

    // Step 4: Update room occupancy
    {
      name: "update_room_occupancy",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const room = previousResults.validate_room as Record<string, unknown>

        const newOccupiedBeds = (room.occupied_beds as number || 0) + 1
        const bedCount = room.total_beds as number || 1
        const newStatus = newOccupiedBeds >= bedCount ? "occupied" : "partially_occupied"

        const { error } = await supabase
          .from("rooms")
          .update({
            occupied_beds: newOccupiedBeds,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.room_id)

        if (error) {
          console.warn("[TenantCreate] Failed to update room occupancy:", error)
        }

        return createSuccessResult({ new_occupied_beds: newOccupiedBeds, new_status: newStatus })
      },
      optional: true,
    },

    // Step 5: Update bed assignment
    {
      name: "update_bed",
      execute: async (context, input, previousResults) => {
        if (!input.bed_id) {
          return createSuccessResult({ bed_updated: false })
        }

        const supabase = createClient()
        const tenant = previousResults.create_tenant as Record<string, unknown>

        const { error } = await supabase
          .from("beds")
          .update({
            current_tenant_id: tenant.id,
            status: "occupied",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.bed_id)

        if (error) {
          console.warn("[TenantCreate] Failed to update bed:", error)
        }

        return createSuccessResult({ bed_updated: true })
      },
      optional: true,
    },

    // Step 6: Save ID documents
    {
      name: "save_documents",
      execute: async (context, input, previousResults) => {
        if (!input.id_documents || input.id_documents.length === 0) {
          return createSuccessResult({ documents_saved: 0 })
        }

        const supabase = createClient()
        const tenant = previousResults.create_tenant as Record<string, unknown>

        const documents = input.id_documents.map((doc) => ({
          tenant_id: tenant.id,
          ...doc,
          created_at: new Date().toISOString(),
        }))

        const { data, error } = await supabase
          .from("tenant_documents")
          .insert(documents)
          .select()

        if (error) {
          console.warn("[TenantCreate] Failed to save documents:", error)
          return createSuccessResult({ documents_saved: 0 })
        }

        return createSuccessResult({ documents_saved: data.length })
      },
      optional: true,
    },

    // Step 7: Generate initial bill (if requested)
    {
      name: "generate_initial_bill",
      execute: async (context, input, previousResults) => {
        if (!input.generate_initial_bill) {
          return createSuccessResult({ bill_generated: false, bill_id: null })
        }

        const supabase = createClient()
        const tenant = previousResults.create_tenant as Record<string, unknown>
        const room = previousResults.validate_room as Record<string, unknown>
        const property = room?.property as Record<string, unknown>

        // Calculate first month charges
        const now = new Date()
        const billMonth = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 5) // 5th of next month

        const lineItems = [
          {
            charge_type: "rent",
            description: `Monthly Rent - ${billMonth}`,
            amount: input.monthly_rent,
          },
        ]

        if (input.security_deposit && input.security_deposit > 0) {
          lineItems.push({
            charge_type: "deposit",
            description: "Security Deposit",
            amount: input.security_deposit,
          })
        }

        if (input.advance_amount && input.advance_amount > 0) {
          lineItems.push({
            charge_type: "advance",
            description: "Advance Payment",
            amount: input.advance_amount,
          })
        }

        const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)

        // Generate bill number
        const { count } = await supabase
          .from("bills")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", context.actor_id)

        const billNumber = `BILL-${String((count || 0) + 1).padStart(5, "0")}`

        const { data: bill, error } = await supabase
          .from("bills")
          .insert({
            tenant_id: tenant.id,
            property_id: input.property_id,
            bill_number: billNumber,
            bill_month: billMonth,
            billing_period_start: input.check_in_date,
            billing_period_end: dueDate.toISOString().split("T")[0],
            due_date: dueDate.toISOString().split("T")[0],
            total_amount: totalAmount,
            paid_amount: 0,
            balance_due: totalAmount,
            status: "pending",
            line_items: lineItems,
            owner_id: context.actor_id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.warn("[TenantCreate] Failed to generate initial bill:", error)
          return createSuccessResult({ bill_generated: false, bill_id: null })
        }

        return createSuccessResult({
          bill_generated: true,
          bill_id: bill.id,
          bill_number: billNumber,
          total_amount: totalAmount,
        })
      },
      optional: true,
    },
  ],

  // Audit events
  auditEvents: (context, input, results) => {
    const tenant = results.create_tenant as Record<string, unknown>
    const room = results.validate_room as Record<string, unknown>

    return [
      createAuditEvent(
        "tenant",
        tenant?.id as string,
        "create",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            name: input.name,
            phone: input.phone,
            room_id: input.room_id,
            monthly_rent: input.monthly_rent,
          },
        }
      ),
      createAuditEvent(
        "room",
        input.room_id,
        "update",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          metadata: { action: "tenant_assigned", tenant_id: tenant?.id },
        }
      ),
    ]
  },

  // Notifications
  notifications: (context, input, results) => {
    const tenant = results.create_tenant as Record<string, unknown>
    const room = results.validate_room as Record<string, unknown>
    const property = room?.property as Record<string, unknown>
    const billResult = results.generate_initial_bill as Record<string, unknown>

    const notifications: NotificationPayload[] = []

    // Welcome notification (if tenant has email and flag is set)
    if (input.send_welcome_notification && input.email) {
      notifications.push(
        buildWelcomeNotification(tenant?.id as string, {
          property_name: property?.name as string || "your PG",
          tenant_name: input.name,
        })
      )
    }

    // Bill notification (if bill was generated)
    if (billResult?.bill_generated && input.email) {
      notifications.push(
        buildBillNotification(tenant?.id as string, {
          bill_id: billResult.bill_id as string,
          bill_number: billResult.bill_number as string,
          amount: formatCurrency(billResult.total_amount as number),
          month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        })
      )
    }

    return notifications
  },

  buildOutput: (results) => {
    const tenant = results.create_tenant as Record<string, unknown>
    const stay = results.create_tenant_stay as Record<string, unknown>
    const billResult = results.generate_initial_bill as Record<string, unknown>

    return {
      tenant_id: tenant?.id as string,
      tenant_stay_id: stay?.id as string || null,
      initial_bill_id: billResult?.bill_id as string || null,
      invitation_sent: false, // TODO: Implement invitation logic
    }
  },
}

// ============================================
// Room Transfer Workflow
// ============================================

export const roomTransferWorkflow: WorkflowDefinition<RoomTransferInput, RoomTransferOutput> = {
  name: "room_transfer",

  steps: [
    // Step 1: Validate tenant and rooms
    {
      name: "validate",
      execute: async (context, input) => {
        const supabase = createClient()

        // Get tenant
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*, room:rooms(id, room_number, occupied_beds)")
          .eq("id", input.tenant_id)
          .single()

        if (tenantError || !tenant) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "Tenant not found")
          )
        }

        // Get new room
        const { data: newRoom, error: roomError } = await supabase
          .from("rooms")
          .select("id, room_number, total_beds, occupied_beds, monthly_rent")
          .eq("id", input.new_room_id)
          .single()

        if (roomError || !newRoom) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "New room not found")
          )
        }

        // Check capacity
        if ((newRoom.occupied_beds || 0) >= (newRoom.total_beds || 1)) {
          return createErrorResult(
            createServiceError(ERROR_CODES.ROOM_AT_CAPACITY, "New room is at full capacity")
          )
        }

        return createSuccessResult({ tenant, newRoom, oldRoom: tenant.room })
      },
    },

    // Step 2: Create room_transfers record
    {
      name: "create_transfer_record",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { tenant, newRoom, oldRoom } = previousResults.validate as Record<string, unknown>

        const { data: transfer, error } = await supabase
          .from("room_transfers")
          .insert({
            tenant_id: input.tenant_id,
            old_room_id: (oldRoom as Record<string, unknown>)?.id || null,
            new_room_id: input.new_room_id,
            old_bed_id: (tenant as Record<string, unknown>)?.bed_id || null,
            new_bed_id: input.new_bed_id || null,
            transfer_date: input.transfer_date,
            reason: input.reason || null,
            old_rent: (tenant as Record<string, unknown>)?.monthly_rent,
            new_rent: input.new_rent || (tenant as Record<string, unknown>)?.monthly_rent,
            created_by: context.actor_id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.warn("[RoomTransfer] Failed to create transfer record:", error)
          return createSuccessResult({ transfer_id: null })
        }

        return createSuccessResult({ transfer_id: transfer.id })
      },
      optional: true,
    },

    // Step 3: Update old room occupancy
    {
      name: "release_old_room",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { oldRoom } = previousResults.validate as Record<string, unknown>

        if (!oldRoom) {
          return createSuccessResult({ released: false })
        }

        const room = oldRoom as Record<string, unknown>
        const newOccupied = Math.max(0, (room.occupied_beds as number || 1) - 1)

        await supabase
          .from("rooms")
          .update({
            occupied_beds: newOccupied,
            status: newOccupied === 0 ? "available" : "occupied",
            updated_at: new Date().toISOString(),
          })
          .eq("id", room.id)

        return createSuccessResult({ released: true })
      },
      optional: true,
    },

    // Step 4: Update new room occupancy
    {
      name: "assign_new_room",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { newRoom } = previousResults.validate as Record<string, unknown>
        const room = newRoom as Record<string, unknown>

        const newOccupied = (room.occupied_beds as number || 0) + 1

        await supabase
          .from("rooms")
          .update({
            occupied_beds: newOccupied,
            status: newOccupied >= (room.total_beds as number || 1) ? "occupied" : "partially_occupied",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.new_room_id)

        return createSuccessResult({ assigned: true })
      },
    },

    // Step 5: Update tenant record
    {
      name: "update_tenant",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { tenant } = previousResults.validate as Record<string, unknown>

        const updateData: Record<string, unknown> = {
          room_id: input.new_room_id,
          bed_id: input.new_bed_id || null,
          updated_at: new Date().toISOString(),
        }

        if (input.adjust_rent && input.new_rent) {
          updateData.monthly_rent = input.new_rent
        }

        const { error } = await supabase
          .from("tenants")
          .update(updateData)
          .eq("id", input.tenant_id)

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update tenant", { error })
          )
        }

        return createSuccessResult({ updated: true, new_rent: input.new_rent })
      },
    },
  ],

  auditEvents: (context, input, results) => {
    const { tenant, oldRoom, newRoom } = results.validate as Record<string, unknown>
    const t = tenant as Record<string, unknown>
    const old = oldRoom as Record<string, unknown>
    const newR = newRoom as Record<string, unknown>

    return [
      createAuditEvent(
        "tenant",
        input.tenant_id,
        "update",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          before: { room_id: old?.id, room_number: old?.room_number },
          after: { room_id: newR?.id, room_number: newR?.room_number },
          metadata: { action: "room_transfer", reason: input.reason },
        }
      ),
    ]
  },

  notifications: () => [],

  buildOutput: (results) => {
    const { oldRoom, newRoom } = results.validate as Record<string, unknown>
    const transferResult = results.create_transfer_record as Record<string, unknown>
    const updateResult = results.update_tenant as Record<string, unknown>

    return {
      transfer_id: transferResult?.transfer_id as string || "",
      old_room_id: (oldRoom as Record<string, unknown>)?.id as string || "",
      new_room_id: (newRoom as Record<string, unknown>)?.id as string,
      rent_adjusted: !!updateResult?.new_rent,
    }
  },
}

// ============================================
// Exported Functions
// ============================================

export async function createTenant(
  input: TenantCreateInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(
    tenantCreateWorkflow,
    input,
    actorId,
    actorType,
    workspaceId
  )
}

export async function transferRoom(
  input: RoomTransferInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(
    roomTransferWorkflow,
    input,
    actorId,
    actorType,
    workspaceId
  )
}
