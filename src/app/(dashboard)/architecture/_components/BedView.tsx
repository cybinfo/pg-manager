"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Bed } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import type { ArchRoom } from "./RoomGrid"

interface ArchTenant {
  id: string
  name: string
  phone: string
  room_id: string
  check_in_date: string
}

interface BedViewProps {
  room: ArchRoom
  tenants: ArchTenant[]
}

export function BedView({ room, tenants }: BedViewProps) {
  const roomTenants = tenants.filter(t => t.room_id === room.id)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Room {room.room_number}</CardTitle>
              <CardDescription>
                Floor {room.floor} | {room.room_type} | {formatCurrency(room.rent_amount)}/month
              </CardDescription>
            </div>
            <Badge variant={room.occupied_beds < room.total_beds ? "default" : "destructive"}>
              {room.occupied_beds}/{room.total_beds} beds occupied
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: room.total_beds }).map((_, idx) => {
              const tenant = roomTenants[idx]
              const isOccupied = idx < roomTenants.length

              return (
                <Card
                  key={idx}
                  className={cn(
                    "relative",
                    isOccupied
                      ? "border-destructive/20 bg-destructive/10"
                      : "border-success/20 bg-success/10 border-dashed"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        isOccupied ? "bg-destructive/10" : "bg-success/10"
                      )}>
                        {isOccupied ? (
                          <User className="h-5 w-5 text-destructive" />
                        ) : (
                          <Bed className="h-5 w-5 text-success" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          Bed {idx + 1}
                        </div>
                        {isOccupied && tenant ? (
                          <div className="text-xs text-muted-foreground">
                            {tenant.name}
                          </div>
                        ) : (
                          <div className="text-xs text-success font-medium">
                            Available
                          </div>
                        )}
                      </div>
                    </div>
                    {isOccupied && tenant && (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <div>{tenant.phone}</div>
                        <div>Since: {new Date(tenant.check_in_date).toLocaleDateString()}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
