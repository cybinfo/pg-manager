import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, FileText } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import type { TenantPortalTenant } from "@/lib/hooks/useTenantPortalData"

interface ProfileHeaderProps {
  tenant: TenantPortalTenant
}

export function ProfileHeader({ tenant }: ProfileHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar name={tenant.name} src={tenant.profile_photo || tenant.photo_url} size="xl" className="bg-primary text-primary-foreground" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{tenant.name}</h2>
            <p className="text-muted-foreground">
              {tenant.property?.name || "Unknown Property"} \u2022 Room {tenant.room?.room_number || "-"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                <CheckCircle className="h-3 w-3" />
                Active Tenant
              </span>
              {tenant.agreement_signed && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                  <FileText className="h-3 w-3" />
                  Agreement Signed
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
