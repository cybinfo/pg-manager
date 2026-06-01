"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, FormField } from "@/components/ui/form-components"
import { Currency } from "@/components/ui/currency"
import { formatCurrency } from "@/lib/format"
import { Loader2, ArrowRightLeft } from "lucide-react"
import { ROOM_TRANSFER_REASON_OPTIONS } from "@/lib/constants/form-options"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { transferTenantRoom } from "@/lib/services/room-transfer"
import type { Tenant, TenantStay } from "@/types/tenants.types"

export interface TransferRoom {
  id: string
  room_number: string
  rent_amount: number
  entity_id: string
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
  const router = useRouter()
  const { user } = useAuth()
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
    if (!user) return

    setActionLoading(true)

    try {
      const selectedRoom = availableRooms.find((r) => r.id === transferData.to_room_id)
      if (!selectedRoom) return

      const supabase = createClient()
      const newRent = parseFloat(transferData.new_rent) || selectedRoom.rent_amount

      await transferTenantRoom(supabase, {
        tenant,
        stays,
        toRoomId: selectedRoom.id,
        toEntityId: selectedRoom.entity_id,
        oldRent: tenant.monthly_rent,
        newRent,
        reason: transferData.reason || null,
        notes: transferData.notes || null,
      }, user.id)

      showSuccess("Room transfer completed!")
      onClose()
      router.refresh()
    } catch (error) {
      handleClientError(error, "Transferring room")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[var(--z-modal)] flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Room
          </CardTitle>
          <p className="text-sm text-muted-foreground">Move {tenant.name} to a different room</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
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
                label: `Room ${room.room_number} (${room.occupied_beds}/${room.total_beds} beds) - ${formatCurrency(room.rent_amount)}`,
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
              options={ROOM_TRANSFER_REASON_OPTIONS}
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
