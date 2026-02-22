"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Home, Bed } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ArchProperty {
  id: string
  name: string
  address: string
  total_rooms: number
  total_beds: number
  occupied_beds: number
}

interface PropertyGridProps {
  properties: ArchProperty[]
  onPropertyClick: (property: ArchProperty) => void
}

export function PropertyGrid({ properties, onPropertyClick }: PropertyGridProps) {
  if (properties.length === 0) {
    return (
      <div className="col-span-full text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No properties match your filter</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map(property => {
        const availableBeds = property.total_beds - property.occupied_beds
        const occupancy = property.total_beds > 0
          ? Math.round((property.occupied_beds / property.total_beds) * 100)
          : 0

        return (
          <Card
            key={property.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
              availableBeds === 0 && "opacity-75"
            )}
            onClick={() => onPropertyClick(property)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    availableBeds > 0 ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    <Building2 className={cn(
                      "h-5 w-5",
                      availableBeds > 0 ? "text-success" : "text-destructive"
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{property.name}</CardTitle>
                    <CardDescription className="text-xs truncate max-w-[200px]">
                      {property.address || "No address"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={availableBeds > 0 ? "default" : "secondary"}>
                  {availableBeds > 0 ? `${availableBeds} free` : "Full"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Home className="h-4 w-4" />
                    {property.total_rooms} rooms
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Bed className="h-4 w-4" />
                    {property.total_beds} beds
                  </span>
                </div>
                <span className="font-medium">{occupancy}%</span>
              </div>
              {/* Occupancy bar */}
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    occupancy >= 90 ? "bg-destructive" :
                    occupancy >= 70 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${occupancy}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
