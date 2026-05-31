"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useDetailPage, BUSINESS_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Business, Location } from "@/types/business.types"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { TableBadge } from "@/components/ui/data-table"
import {
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Pencil,
  Plus,
  Building2,
  Library,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { BUSINESS_ENTITY_TYPE_LABELS } from "@/types/business.types"

export default function BusinessDetailPage() {
  const params = useParams()
  const { backHref, backLabel } = useBackNavigation({
    defaultHref: "/businesses",
    defaultLabel: "All Businesses",
  })

  const { data: business, related, loading } = useDetailPage<Business>({
    config: BUSINESS_DETAIL_CONFIG,
    id: params.id as string,
  })

  if (loading) return <PageLoading message="Loading business details..." />
  if (!business) return <NotFoundState title="Business not found" backHref="/businesses" backLabel="All Businesses" />

  const locations = (related.locations || []) as Location[]
  const activeLocations = locations.filter((l) => l.is_active)

  return (
    <DetailPageTemplate
      layoutKey="business-detail"
      entityType="business"
      record={business as unknown as import("@/types/audit.types").AuditableEntity & { id: string }}
    >
      <DetailHero
        title={business.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {business.legal_name && <span>{business.legal_name}</span>}
            {business.business_type && (
              <TableBadge variant="info" className="capitalize">
                {BUSINESS_ENTITY_TYPE_LABELS[business.business_type as keyof typeof BUSINESS_ENTITY_TYPE_LABELS] || business.business_type}
              </TableBadge>
            )}
            {business.is_active ? (
              <TableBadge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />Active
              </TableBadge>
            ) : (
              <TableBadge variant="muted">
                <XCircle className="h-3 w-3 mr-1" />Inactive
              </TableBadge>
            )}
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
        <InfoCard
          label="Locations"
          value={`${locations.length} (${activeLocations.length} active)`}
          icon={MapPin}
        />
        <InfoCard
          label="GST"
          value={business.gst_number || "—"}
          icon={FileText}
        />
        <InfoCard
          label="PAN"
          value={business.pan_number || "—"}
          icon={FileText}
        />
        <InfoCard
          label="Added"
          value={formatDate(business.created_at)}
          icon={Briefcase}
        />
      </div>

      {/* Business Details */}
      <DetailSection title="Business Details" icon={Briefcase}>
        <InfoRow label="Business Name" value={business.name} />
        <InfoRow label="Legal Name" value={business.legal_name || "—"} />
        <InfoRow label="Business Type" value={business.business_type ? (BUSINESS_ENTITY_TYPE_LABELS[business.business_type as keyof typeof BUSINESS_ENTITY_TYPE_LABELS] || business.business_type) : "—"} />
        {business.description && (
          <InfoRow label="Description" value={business.description} />
        )}
        <InfoRow label="Registration No." value={business.registration_number || "—"} />
      </DetailSection>

      {/* Tax Details */}
      <DetailSection title="Legal & Tax" icon={FileText}>
        <InfoRow label="GST Number" value={business.gst_number || "—"} />
        <InfoRow label="PAN Number" value={business.pan_number || "—"} />
        <InfoRow label="Registration" value={business.registration_number || "—"} />
      </DetailSection>

      {/* Contact Details */}
      <DetailSection title="Contact" icon={Phone}>
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
        {!business.phone && !business.email && !business.website && (
          <p className="text-sm text-muted-foreground">No contact details added yet.</p>
        )}
      </DetailSection>

      {/* Locations */}
      <DetailListSection
        title="Locations"
        icon={MapPin}
        items={locations}
        keyExtractor={(loc) => loc.id}
        renderItem={(loc) => (
          <Link
            href={`/locations/${loc.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {loc.name}
                  {loc.is_primary && (
                    <TableBadge variant="info" className="text-[10px]">Primary</TableBadge>
                  )}
                </div>
                {loc.city && (
                  <div className="text-xs text-muted-foreground">{loc.city}{loc.state && `, ${loc.state}`}</div>
                )}
              </div>
            </div>
            {!loc.is_active && <TableBadge variant="muted">Inactive</TableBadge>}
          </Link>
        )}
        viewAllHref={`/locations?business_id=${business.id}`}
        viewAllLabel="All Locations"
        emptyText="No locations added yet."
        actions={
          <PermissionGate permission="locations.create" hide>
            <Link href={`/locations/new?business_id=${business.id}`}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Location
              </Button>
            </Link>
          </PermissionGate>
        }
      />
    </DetailPageTemplate>
  )
}
