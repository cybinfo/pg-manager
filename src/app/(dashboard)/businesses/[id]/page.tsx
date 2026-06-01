"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useDetailPage, BUSINESS_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Business } from "@/types/business.types"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { TableBadge } from "@/components/ui/data-table"
import { Combobox } from "@/components/ui/combobox"
import {
  Briefcase,
  Building2,
  Globe,
  FileText,
  Pencil,
  Plus,
  LayoutDashboard,
  Link2,
  Link2Off,
  Loader2,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { BUSINESS_ENTITY_TYPE_LABELS } from "@/types/business.types"
import { createClient } from "@/lib/supabase/client"
import { showError, showSuccess } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"

type LinkedEntity = {
  id: string
  name: string
  type: string
  city: string | null
  is_active: boolean
  created_at: string
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  pg: "PG / Hostel",
  library: "Library",
  gym: "Gym",
  hospital: "Hospital",
  school: "School",
  hotel: "Hotel",
}

export default function BusinessDetailPage() {
  const params = useParams()
  const { backHref, backLabel } = useBackNavigation({
    defaultHref: "/businesses",
    defaultLabel: "All Businesses",
  })

  const { data: business, related, loading, refetch } = useDetailPage<Business>({
    config: BUSINESS_DETAIL_CONFIG,
    id: params.id as string,
  })

  const [linkLoading, setLinkLoading] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [unlinkOptions, setUnlinkOptions] = useState<Array<{ value: string; label: string }>>([])
  const [showLinkCombobox, setShowLinkCombobox] = useState(false)
  const [linkValue, setLinkValue] = useState("")

  const loadUnlinkedEntities = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("entities")
      .select("id, name, type")
      .is("business_id", null)
      .order("name")
    if (error) {
      showError("Could not load entities")
      return
    }
    setUnlinkOptions(
      (data || []).map((e: { id: string; name: string; type: string }) => ({
        value: e.id,
        label: `${e.name} (${ENTITY_TYPE_LABELS[e.type] ?? e.type})`,
      }))
    )
    setShowLinkCombobox(true)
  }, [])

  const handleLink = useCallback(async (entityId: string) => {
    if (!business || !entityId) return
    setLinkLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("entities")
        .update({ business_id: business.id })
        .eq("id", entityId)
      if (error) throw error
      showSuccess("Entity linked to business")
      setShowLinkCombobox(false)
      setLinkValue("")
      refetch()
    } catch (err) {
      handleClientError(err, "Linking entity")
    } finally {
      setLinkLoading(false)
    }
  }, [business, refetch])

  const handleUnlink = useCallback(async (entityId: string) => {
    setUnlinkingId(entityId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("entities")
        .update({ business_id: null })
        .eq("id", entityId)
      if (error) throw error
      showSuccess("Entity unlinked from business")
      refetch()
    } catch (err) {
      handleClientError(err, "Unlinking entity")
    } finally {
      setUnlinkingId(null)
    }
  }, [refetch])

  if (loading) return <PageLoading message="Loading business details..." />
  if (!business) return <NotFoundState title="Business not found" backHref="/businesses" backLabel="All Businesses" />

  const entities = (related.entities || []) as LinkedEntity[]
  const workspace = business.workspace

  const typeLabel = business.business_type
    ? (BUSINESS_ENTITY_TYPE_LABELS[business.business_type as keyof typeof BUSINESS_ENTITY_TYPE_LABELS] ?? business.business_type)
    : null

  const regAddress = [business.reg_address, business.reg_city, business.reg_state, business.reg_pincode]
    .filter(Boolean)
    .join(", ")

  return (
    <DetailPageTemplate
      layoutKey="business-detail"
      entityType="business"
      record={business as unknown as import("@/types/audit.types").AuditableEntity & { id: string }}
    >
      <DetailHero
        title={business.name}
        subtitle={
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {business.legal_name && <span>{business.legal_name}</span>}
            {typeLabel && <TableBadge variant="info">{typeLabel}</TableBadge>}
            {business.is_active
              ? <TableBadge variant="success">Active</TableBadge>
              : <TableBadge variant="muted">Inactive</TableBadge>}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          { label: business.name },
        ]}
        actions={
          <PermissionGate permission="businesses.edit" hide>
            <Link href={`/businesses/${business.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </PermissionGate>
        }
      />

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InfoCard label="Entities" value={String(entities.length)} icon={Building2} />
        <InfoCard label="GST" value={business.gst_number || "—"} icon={FileText} />
        <InfoCard label="PAN" value={business.pan_number || "—"} icon={FileText} />
        <InfoCard label="Added" value={formatDate(business.created_at)} icon={Briefcase} />
      </div>

      {/* Section 1: Workspace */}
      {workspace && (
        <DetailSection title="Workspace" icon={LayoutDashboard}>
          <InfoRow label="Workspace Name" value={workspace.name} />
          <InfoRow
            label="Type"
            value={
              <TableBadge variant="info" className="capitalize">
                {workspace.type?.replace("_", " ") ?? "—"}
              </TableBadge>
            }
          />
          <InfoRow
            label="Status"
            value={
              workspace.is_active
                ? <TableBadge variant="success">Active</TableBadge>
                : <TableBadge variant="muted">Inactive</TableBadge>
            }
          />
        </DetailSection>
      )}

      {/* Section 2: Business Details */}
      <DetailSection title="Business Details" icon={Briefcase}>
        <InfoRow label="Business Name" value={business.name} />
        {business.legal_name && <InfoRow label="Legal Name" value={business.legal_name} />}
        {typeLabel && <InfoRow label="Business Type" value={typeLabel} />}
        {business.description && <InfoRow label="Description" value={business.description} />}
        {business.registration_number && (
          <InfoRow label="Registration / CIN" value={business.registration_number} />
        )}
        <InfoRow label="GST Number" value={business.gst_number || "—"} />
        <InfoRow label="PAN Number" value={business.pan_number || "—"} />
        {regAddress && <InfoRow label="Registered Address" value={regAddress} />}
        {business.phone && (
          <InfoRow
            label="Phone"
            value={
              <a href={`tel:${business.phone}`} className="text-primary hover:underline">
                {business.phone}
              </a>
            }
          />
        )}
        {business.email && (
          <InfoRow
            label="Email"
            value={
              <a href={`mailto:${business.email}`} className="text-primary hover:underline">
                {business.email}
              </a>
            }
          />
        )}
        {business.website && (
          <InfoRow
            label="Website"
            value={
              <a href={business.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {business.website.replace(/^https?:\/\//, "")}
              </a>
            }
          />
        )}
      </DetailSection>

      {/* Section 3: Linked Entities */}
      <DetailSection
        title="Linked Entities"
        icon={Building2}
        actions={
          <PermissionGate permission="businesses.edit" hide>
            <Button
              variant="outline"
              size="sm"
              onClick={showLinkCombobox ? () => setShowLinkCombobox(false) : loadUnlinkedEntities}
              disabled={linkLoading}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Link Existing
            </Button>
            <Link href="/entities/new">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Entity
              </Button>
            </Link>
          </PermissionGate>
        }
      >
        {showLinkCombobox && (
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1">
              <Combobox
                options={unlinkOptions}
                value={linkValue}
                onValueChange={(val) => {
                  setLinkValue(val)
                  if (val) handleLink(val)
                }}
                placeholder="Search unlinked entities..."
                emptyText="No unlinked entities found"
              />
            </div>
            {linkLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        )}

        {entities.length === 0 && !showLinkCombobox ? (
          <p className="text-sm text-muted-foreground py-2">No entities linked to this business yet.</p>
        ) : (
          <div className="space-y-2">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Link href={`/entities/${entity.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{entity.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <TableBadge variant="info">
                        {ENTITY_TYPE_LABELS[entity.type] ?? entity.type}
                      </TableBadge>
                      {entity.city && <span>{entity.city}</span>}
                      {!entity.is_active && <TableBadge variant="muted">Inactive</TableBadge>}
                    </div>
                  </div>
                </Link>
                <PermissionGate permission="businesses.edit" hide>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive flex-shrink-0 ml-2"
                    onClick={() => handleUnlink(entity.id)}
                    disabled={unlinkingId === entity.id}
                    title="Unlink entity from business"
                  >
                    {unlinkingId === entity.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Link2Off className="h-4 w-4" />}
                  </Button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </DetailSection>
    </DetailPageTemplate>
  )
}
