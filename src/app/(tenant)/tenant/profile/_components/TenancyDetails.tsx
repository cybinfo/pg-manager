import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle, AlertCircle, Flag } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"
import { StatusBadge } from "@/components/ui/status-badge"
import { POLICE_VERIFICATION_STATUS } from "@/lib/status"
import type { ApprovalType } from "@/components/tenant/report-issue-dialog"
import type { TenantPortalTenant } from "@/lib/hooks/useTenantPortalData"

type StatusBadgeVariant = "success" | "warning" | "error" | "info" | "muted" | "primary" | "purple"

const VERIFICATION_VARIANT_MAP: Record<string, StatusBadgeVariant> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  muted: "muted",
  default: "info",
}

interface TenancyDetailsProps {
  tenant: TenantPortalTenant
  onReport: (label: string, value: string, type: ApprovalType) => void
}

export function TenancyDetails({ tenant, onReport }: TenancyDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Tenancy Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Check-in Date</p>
              <p className="font-medium">{formatDate(tenant.check_in_date)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/5"
              onClick={() => onReport("Check-in Date", formatDate(tenant.check_in_date), "tenancy_issue")}
              title="Report issue with check-in date"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium text-lg">{formatCurrency(tenant.monthly_rent)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/5"
              onClick={() => onReport("Monthly Rent", formatCurrency(tenant.monthly_rent), "tenancy_issue")}
              title="Report issue with monthly rent"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Police Verification</p>
            <div className="mt-1">
              {(() => {
                const cfg = POLICE_VERIFICATION_STATUS[tenant.police_verification_status]
                const variant = VERIFICATION_VARIANT_MAP[cfg?.variant ?? "muted"] ?? "muted"
                return <StatusBadge variant={variant} label={cfg?.label ?? "N/A"} />
              })()}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Agreement Status</p>
            <div className="mt-1">
              {tenant.agreement_signed ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded text-xs font-medium">
                  <CheckCircle className="h-3 w-3" />
                  Signed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning rounded text-xs font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
