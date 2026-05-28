"use client"

import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { ReportIssueDialog, ApprovalType } from "@/components/tenant/report-issue-dialog"
import { useTenantPortalData } from "@/lib/hooks/useTenantPortalData"
import { useTenantProfile } from "@/lib/hooks/useTenantProfile"
import {
  ProfileHeader,
  ContactInfo,
  TenancyDetails,
  PropertyRoomDetails,
  RequestsSection,
} from "./_components"

export default function TenantProfilePage() {
  const { tenant, tenantContext, user, loading: tenantLoading } = useTenantPortalData()
  const { requests, refetch: refetchRequests } = useTenantProfile()
  const [showRequests, setShowRequests] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedField, setSelectedField] = useState<{
    label: string
    value: string
    type: ApprovalType
  } | null>(null)

  const openReportDialog = (label: string, value: string, type: ApprovalType) => {
    setSelectedField({ label, value, type })
    setDialogOpen(true)
  }

  const handleRequestSuccess = () => {
    if (tenant) {
      refetchRequests(tenant.id)
    }
  }

  if (tenantLoading) {
    return <PageSkeleton variant="detail" />
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground">Unable to load your profile.</p>
      </div>
    )
  }

  const userEmail = user?.email || ""

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Your personal and tenancy information</p>
      </div>

      <ProfileHeader tenant={tenant} />

      <ContactInfo
        tenant={tenant}
        userEmail={userEmail}
        onReport={openReportDialog}
      />

      <TenancyDetails
        tenant={tenant}
        onReport={openReportDialog}
      />

      <PropertyRoomDetails
        tenant={tenant}
        onReport={openReportDialog}
      />

      <RequestsSection
        requests={requests}
        showRequests={showRequests}
        onToggleRequests={() => setShowRequests(!showRequests)}
      />

      {selectedField && tenantContext && (
        <ReportIssueDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          fieldLabel={selectedField.label}
          currentValue={selectedField.value}
          approvalType={selectedField.type}
          tenantId={tenantContext.id}
          workspaceId={tenantContext.workspace_id}
          ownerId={tenantContext.owner_id}
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
  )
}
