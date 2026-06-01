"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, Bed } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

export interface ArchRoom {
  id: string
  room_number: string
  room_type: string
  floor: number
  total_beds: number
  occupied_beds: number
  rent_amount: number
  status: string
  entity_id: string
}

interface RoomGridProps {
  rooms: ArchRoom[]
  onRoomClick: (room: ArchRoom) => void
}

export function RoomGrid({ rooms, onRoomClick }: RoomGridProps) {
  if (rooms.length === 0) {
    return (
      <div className="col-span-full text-center py-12 text-muted-foreground">
        <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No rooms match your filter</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {rooms.map(room => {
        const availableBeds = room.total_beds - room.occupied_beds
        const isFull = availableBeds === 0

        return (
          <Card
            key={room.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isFull ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5 hover:border-success/40"
            )}
            onClick={() => onRoomClick(room)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{room.room_number}</span>
                <Badge variant={isFull ? "destructive" : "default"} className="text-xs">
                  {availableBeds}/{room.total_beds}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Floor {room.floor} | {room.room_type}
              </div>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: room.total_beds }).map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center",
                      idx < room.occupied_beds
                        ? "bg-destructive text-white"
                        : "bg-success text-white"
                    )}
                  >
                    <Bed className="h-3 w-3" />
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {formatCurrency(room.rent_amount)}/mo
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
