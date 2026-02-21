"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, FormField } from "@/components/ui/form-components"
import { Currency } from "@/components/ui/currency"
import { Loader2, ArrowRightLeft } from "lucide-react"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { createClient } from "@/lib/supabase/client"
import type { Tenant, TenantStay } from "@/types/tenants.types"

export interface TransferRoom {
  id: string
  room_number: string
  rent_amount: number
  property_id: string
  total_beds: number
  occupied_beds: number
}

interface RoomTransferModalProps {
  tenant: Tenant
  stays: TenantStay[]
  availableRooms: TransferRoom[]
  onClose: () => void
}

export function RoomTransferModal({ tenant, stays, availableRooms, onClose }: RoomTransferModalProps) {
  const [actionLoading, setActionLoading] = useState(false)
  const [transferData, setTransferData] = useState({
    to_room_id: "",
    new_rent: "",
    reason: "",
    notes: "",
  })

  const handleRoomTransfer = async () => {
    if (!transferData.to_room_id) {
      showError("Please select a room")
      return
    }

    setActionLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const selectedRoom = availableRooms.find((r) => r.id === transferData.to_room_id)
      if (!selectedRoom) return

      const newRent = parseFloat(transferData.new_rent) || selectedRoom.rent_amount

      // Create transfer record
      await supabase.from("room_transfers").insert({
        owner_id: user.id,
        tenant_id: tenant.id,
        from_property_id: tenant.property?.id,
        from_room_id: tenant.room?.id,
        to_property_id: selectedRoom.property_id,
        to_room_id: selectedRoom.id,
        transfer_date: new Date().toISOString().split("T")[0],
        reason: transferData.reason || null,
        notes: transferData.notes || null,
        old_rent: tenant.monthly_rent,
        new_rent: newRent,
      })

      // Update current stay
      await supabase
        .from("tenant_stays")
        .update({ status: "transferred", exit_date: new Date().toISOString().split("T")[0], exit_reason: "transferred" })
        .eq("tenant_id", tenant.id)
        .eq("status", "active")

      // Create new stay
      const stayNumber = stays.length > 0 ? Math.max(...stays.map((s) => s.stay_number)) + 1 : 1
      await supabase.from("tenant_stays").insert({
        owner_id: user.id,
        tenant_id: tenant.id,
        property_id: selectedRoom.property_id,
        room_id: selectedRoom.id,
        join_date: new Date().toISOString().split("T")[0],
        monthly_rent: newRent,
        security_deposit: tenant.security_deposit,
        status: "active",
        stay_number: stayNumber,
      })

      // Update tenant record
      await supabase
        .from("tenants")
        .update({ property_id: selectedRoom.property_id, room_id: selectedRoom.id, monthly_rent: newRent })
        .eq("id", tenant.id)

      showSuccess("Room transfer completed!")
      onClose()
      window.location.reload()
    } catch (error) {
      handleClientError(error, "Transferring room")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Room
          </CardTitle>
          <p className="text-sm text-muted-foreground">Move {tenant.name} to a different room</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="text-muted-foreground">Current Room</p>
            <p className="font-medium">{tenant.property?.name} - Room {tenant.room?.room_number}</p>
            <p className="text-muted-foreground">Rent: <Currency amount={tenant.monthly_rent} /></p>
          </div>

          <FormField label="New Room" required>
            <Select
              value={transferData.to_room_id}
              onChange={(e) => {
                const room = availableRooms.find((r) => r.id === e.target.value)
                setTransferData({
                  ...transferData,
                  to_room_id: e.target.value,
                  new_rent: room ? room.rent_amount.toString() : "",
                })
              }}
              options={availableRooms.map((room) => ({
                value: room.id,
                label: `Room ${room.room_number} (${room.occupied_beds}/${room.total_beds} beds) - ₹${room.rent_amount}`,
              }))}
              placeholder="Select a room"
            />
          </FormField>

          <FormField label="New Rent (₹)" hint="Leave blank to use room's default rent">
            <Input
              type="number"
              value={transferData.new_rent}
              onChange={(e) => setTransferData({ ...transferData, new_rent: e.target.value })}
              placeholder="Leave blank for default"
            />
          </FormField>

          <FormField label="Reason">
            <Select
              value={transferData.reason}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              options={[
                { value: "upgrade", label: "Upgrade" },
                { value: "downgrade", label: "Downgrade" },
                { value: "request", label: "Tenant Request" },
                { value: "maintenance", label: "Maintenance" },
                { value: "other", label: "Other" },
              ]}
              placeholder="Select reason"
            />
          </FormField>

          <FormField label="Notes">
            <Input
              value={transferData.notes}
              onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
              placeholder="Additional notes"
            />
          </FormField>
        </CardContent>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="outline" onClick={onClose} disabled={actionLoading}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleRoomTransfer} disabled={actionLoading || !transferData.to_room_id}>
            {actionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
