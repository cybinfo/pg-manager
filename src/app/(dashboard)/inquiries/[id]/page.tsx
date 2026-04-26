/**
 * Inquiry Detail Page
 *
 * View and manage a website inquiry/lead.
 * Status workflow: new -> contacted -> converted/closed
 */

"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, INQUIRY_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import {
  DetailHero,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import {
  Loader2,
  Inbox,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Building2,
  Home,
  Edit2,
  Save,
  X,
  UserCheck,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react"
import { PropertyLink } from "@/components/ui/entity-link"
import { formatDateTime, formatDate, formatPhone } from "@/lib/format"
import { generateWhatsAppLink } from "@/lib/notifications"
import { PermissionGate } from "@/components/auth"
import { showSuccess } from "@/lib/toast-helpers"
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_COLORS, INQUIRY_SOURCE_LABELS } from "@/lib/status"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

// ============================================
// Types
// ============================================

interface Inquiry {
  id: string
  name: string
  phone: string
  email: string | null
  message: string | null
  preferred_room_type: string | null
  expected_move_in: string | null
  status: "new" | "contacted" | "converted" | "closed"
  notes: string | null
  source: "website" | "whatsapp" | "phone"
  property_id: string
  owner_id: string
  property: { id: string; name: string; city: string } | null
  created_at: string
  updated_at: string
}

// ============================================
// Constants
// ============================================

const statusLabels = INQUIRY_STATUS_LABELS
const statusColors = INQUIRY_STATUS_COLORS
const sourceLabels = INQUIRY_SOURCE_LABELS

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
]

// ============================================
// Status Badge Component
// ============================================

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || statusColors.new}`}>
    {statusLabels[status] || status}
  </span>
)

// ============================================
// Page Component
// ============================================

export default function InquiryDetailPage() {
  const params = useParams()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/inquiries", defaultLabel: "All Inquiries" })
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    status: "",
    notes: "",
  })

  const {
    data: inquiry,
    loading,
    updateFields,
    isSaving,
  } = useDetailPage<Inquiry>({
    config: INQUIRY_DETAIL_CONFIG,
    id: params.id as string,
  })

  // Initialize edit data when inquiry loads
  useEffect(() => {
    if (inquiry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditData({
        status: inquiry.status,
        notes: inquiry.notes || "",
      })
    }
  }, [inquiry])

  const handleQuickStatusChange = async (newStatus: string) => {
    const success = await updateFields({ status: newStatus })
    if (success) {
      showSuccess(`Status updated to ${statusLabels[newStatus]}`)
    }
  }

  const handleSave = async () => {
    const success = await updateFields({
      status: editData.status,
      notes: editData.notes || null,
    })
    if (success) {
      setEditing(false)
      showSuccess("Inquiry updated successfully")
    }
  }

  if (loading) {
    return <PageLoading message="Loading inquiry details..." />
  }

  if (!inquiry) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const whatsappMessage = `Hi ${inquiry.name}, thank you for your inquiry about ${inquiry.property?.name || "our PG"}. I'd like to discuss your requirements and schedule a visit. When would be a good time?`

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={inquiry.name}
        subtitle={`Inquiry from ${sourceLabels[inquiry.source]}`}
        backHref={backHref}
        backLabel={backLabel}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Inbox className="h-8 w-8 text-primary" />
          </div>
        }
        status={<StatusBadge status={inquiry.status} />}
        actions={
          <div className="flex gap-2">
            {/* Quick Actions */}
            <a href={`tel:${inquiry.phone}`}>
              <Button variant="outline" size="sm">
                <Phone className="mr-2 h-4 w-4" />
                Call
              </Button>
            </a>
            <a
              href={generateWhatsAppLink(inquiry.phone, whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="text-success border-success/20 hover:bg-success/10">
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
            {inquiry.email && (
              <a href={`mailto:${inquiry.email}`}>
                <Button variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </a>
            )}

            <PermissionGate permission="tenants.create">
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </PermissionGate>
          </div>
        }
      />

      {/* Quick Status Actions */}
      <PermissionGate permission="tenants.create">
        {!editing && inquiry.status !== "converted" && inquiry.status !== "closed" && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {inquiry.status === "new" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStatusChange("contacted")}
                  disabled={isSaving}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Mark as Contacted
                </Button>
              )}
              {(inquiry.status === "new" || inquiry.status === "contacted") && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-success border-success/20 hover:bg-success/10"
                    onClick={() => handleQuickStatusChange("converted")}
                    disabled={isSaving}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Convert to Tenant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-foreground"
                    onClick={() => handleQuickStatusChange("closed")}
                    disabled={isSaving}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Close (Not Interested)
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </PermissionGate>

      <DetailPageTemplate layoutKey="inquiry-detail" entityType="inquiry" record={inquiry}>
        {/* Contact Information */}
        <DetailSection title="Contact Information" icon={Phone}>
          <div className="grid md:grid-cols-2 gap-4">
            <InfoRow
              label="Phone"
              value={
                <a href={`tel:${inquiry.phone}`} className="text-primary hover:underline">
                  {formatPhone(inquiry.phone)}
                </a>
              }
              icon={Phone}
            />
            <InfoRow
              label="Email"
              value={
                inquiry.email ? (
                  <a href={`mailto:${inquiry.email}`} className="text-primary hover:underline">
                    {inquiry.email}
                  </a>
                ) : (
                  "Not provided"
                )
              }
              icon={Mail}
            />
          </div>
        </DetailSection>

        {/* Status Card */}
        <DetailSection title="Status" icon={Clock}>
          {editing ? (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editData.status}
                onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                options={statusOptions}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <StatusBadge status={inquiry.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span>{sourceLabels[inquiry.source]}</span>
              </div>
            </div>
          )}
        </DetailSection>

        {/* Inquiry Details */}
        <DetailSection title="Inquiry Details" icon={MessageSquare}>
          <div className="grid md:grid-cols-2 gap-4">
            <InfoRow
              label="Preferred Room Type"
              value={
                inquiry.preferred_room_type ? (
                  <span className="capitalize">{inquiry.preferred_room_type} room</span>
                ) : (
                  "Any / Not specified"
                )
              }
              icon={Home}
            />
            <InfoRow
              label="Expected Move-in"
              value={inquiry.expected_move_in ? formatDate(inquiry.expected_move_in) : "Not specified"}
              icon={Calendar}
            />
          </div>

          {inquiry.message && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm text-muted-foreground">Message</Label>
              <p className="mt-1 whitespace-pre-line">{inquiry.message}</p>
            </div>
          )}
        </DetailSection>

        {/* Property Card */}
        {inquiry.property && (
          <DetailSection title="Property" icon={Building2}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-info" />
                </div>
                <div>
                  <PropertyLink id={inquiry.property.id} name={inquiry.property.name} />
                  <p className="text-sm text-muted-foreground">{inquiry.property.city}</p>
                </div>
              </div>
              <Link href={`/properties/${inquiry.property.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Property
                </Button>
              </Link>
            </div>
          </DetailSection>
        )}

        {/* Timeline Card */}
        <DetailSection title="Timeline" icon={Calendar}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received</span>
              <span>{formatDateTime(inquiry.created_at)}</span>
            </div>
            {inquiry.updated_at !== inquiry.created_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatDateTime(inquiry.updated_at)}</span>
              </div>
            )}
          </div>
        </DetailSection>

        {/* Notes (Editable) */}
        <DetailSection title="Internal Notes" icon={Edit2}>
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this inquiry..."
                rows={4}
              />
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg min-h-[100px]">
              {inquiry.notes ? (
                <p className="whitespace-pre-line">{inquiry.notes}</p>
              ) : (
                <p className="text-muted-foreground italic">No notes yet. Click Edit to add notes.</p>
              )}
            </div>
          )}
        </DetailSection>

        {/* Convert to Tenant Card */}
        {inquiry.status === "converted" && (
          <DetailSection title="Next Steps" icon={UserCheck}>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This inquiry has been marked as converted. Create a tenant record to complete the onboarding.
              </p>
              <Link href={`/tenants/new?name=${encodeURIComponent(inquiry.name)}&phone=${encodeURIComponent(inquiry.phone)}&email=${encodeURIComponent(inquiry.email || "")}&property_id=${inquiry.property_id}`}>
                <Button className="w-full">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Create Tenant Record
                </Button>
              </Link>
            </div>
          </DetailSection>
        )}

      </DetailPageTemplate>
    </div>
  )
}
