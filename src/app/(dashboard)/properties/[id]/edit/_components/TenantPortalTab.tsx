"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  FileText,
  CreditCard,
  MessageSquare,
  Bell,
  UserPlus,
  Download,
  UserCog,
} from "lucide-react"

interface TenantFeatures {
  view_bills: boolean
  view_payments: boolean
  submit_complaints: boolean
  view_notices: boolean
  request_visitors: boolean
  download_receipts: boolean
  update_profile: boolean
}

const tenantFeatureOptions = [
  { key: "view_bills", label: "View Bills", desc: "Allow tenants to see their bills", icon: FileText },
  { key: "view_payments", label: "View Payments", desc: "Allow tenants to see payment history", icon: CreditCard },
  { key: "submit_complaints", label: "Submit Complaints", desc: "Allow tenants to raise complaints", icon: MessageSquare },
  { key: "view_notices", label: "View Notices", desc: "Allow tenants to see property announcements", icon: Bell },
  { key: "request_visitors", label: "Request Visitors", desc: "Allow tenants to pre-register visitors", icon: UserPlus },
  { key: "download_receipts", label: "Download Receipts", desc: "Allow tenants to download payment PDFs", icon: Download },
  { key: "update_profile", label: "Update Profile", desc: "Allow tenants to edit their own details", icon: UserCog },
]

interface TenantPortalTabProps {
  tenantFeatures: TenantFeatures
  onFeatureChange: (key: keyof TenantFeatures, value: boolean) => void
  loading: boolean
}

export function TenantPortalTab({ tenantFeatures, onFeatureChange, loading }: TenantPortalTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle>Tenant Portal Features</CardTitle>
            <CardDescription>
              Control what features tenants can access when they login to their portal for this property
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tenantFeatureOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tenantFeatures[option.key as keyof TenantFeatures]}
                  onChange={(e) =>
                    onFeatureChange(option.key as keyof TenantFeatures, e.target.checked)
                  }
                  className="sr-only peer"
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-sm text-warning">
            <strong>Note:</strong> These settings apply to all tenants of this property.
            When a tenant logs into the tenant portal, they will only see the features enabled above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
