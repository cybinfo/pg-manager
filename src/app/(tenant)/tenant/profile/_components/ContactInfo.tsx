import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Phone, Mail, Flag } from "lucide-react"
import { ProfileFieldRow } from "@/components/portal"
import type { ApprovalType } from "@/components/tenant/report-issue-dialog"
import type { TenantPortalTenant } from "@/lib/hooks/useTenantPortalData"

interface ContactInfoProps {
  tenant: TenantPortalTenant
  userEmail: string
  onReport: (label: string, value: string, type: ApprovalType) => void
}

export function ContactInfo({ tenant, userEmail, onReport }: ContactInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <ProfileFieldRow
            icon={User}
            label="Name"
            value={tenant.name}
            onReport={() => onReport("Name", tenant.name, "name_change")}
          />
          <ProfileFieldRow
            icon={Phone}
            label="Phone"
            value={tenant.phone}
            onReport={() => onReport("Phone Number", tenant.phone, "phone_change")}
          />
          <ProfileFieldRow
            icon={Mail}
            label="Email"
            value={userEmail || tenant.email || "Not provided"}
            onReport={() => onReport("Email", userEmail || tenant.email || "", "email_change")}
          />
        </div>

        {tenant.custom_fields && Object.keys(tenant.custom_fields).length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
            {Object.entries(tenant.custom_fields).map(([key, value]) => {
              if (!value) return null
              const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              return (
                <div key={key} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-5 w-5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-medium">{String(value)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/5"
                    onClick={() => onReport(label, String(value), "other")}
                    title={"Report issue with " + label.toLowerCase()}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
