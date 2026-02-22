import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Home, MapPin, Flag } from "lucide-react"
import type { ApprovalType } from "@/components/tenant/report-issue-dialog"
import type { TenantPortalTenant } from "@/lib/hooks/useTenantPortalData"

interface PropertyRoomDetailsProps {
  tenant: TenantPortalTenant
  onReport: (label: string, value: string, type: ApprovalType) => void
}

export function PropertyRoomDetails({ tenant, onReport }: PropertyRoomDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Property & Room
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">{tenant.property?.name || "Unknown Property"}</h4>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              {tenant.property?.address && (tenant.property.address + ", ")}
              {tenant.property?.city || ""}
              {tenant.property?.state && (", " + tenant.property.state)}
            </p>
          </div>
        </div>

        {/* Room */}
        {tenant.room && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Home className="h-4 w-4" />
                Room {tenant.room.room_number}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground capitalize">
                  {tenant.room.room_type || "Standard"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                  onClick={() => onReport(
                    "Room Assignment",
                    "Room " + tenant.room!.room_number + " (" + (tenant.room!.room_type || "Standard") + ")",
                    "room_issue"
                  )}
                  title="Report issue with room assignment"
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {tenant.room.floor !== null && tenant.room.floor !== undefined && (
                <div className="p-2 bg-muted rounded text-center relative group">
                  <p className="text-muted-foreground text-xs">Floor</p>
                  <p className="font-medium">{tenant.room.floor}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onReport("Floor", String(tenant.room!.floor), "room_issue")}
                    title="Report issue with floor"
                  >
                    <Flag className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="p-2 bg-muted rounded text-center relative group">
                <p className="text-muted-foreground text-xs">AC</p>
                <p className="font-medium">{tenant.room.has_ac ? "Yes" : "No"}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onReport("AC Status", tenant.room!.has_ac ? "Yes" : "No", "room_issue")}
                  title="Report issue with AC status"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-2 bg-muted rounded text-center relative group">
                <p className="text-muted-foreground text-xs">Attached Bath</p>
                <p className="font-medium">{tenant.room.has_attached_bathroom ? "Yes" : "No"}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onReport("Attached Bathroom", tenant.room!.has_attached_bathroom ? "Yes" : "No", "room_issue")}
                  title="Report issue with attached bathroom"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {tenant.room.amenities && tenant.room.amenities.length > 0 && (
              <div className="mt-4 relative group">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onReport("Amenities", tenant.room!.amenities?.join(", ") || "", "room_issue")}
                    title="Report issue with amenities"
                  >
                    <Flag className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tenant.room.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
