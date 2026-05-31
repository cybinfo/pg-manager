"use client"

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
  DetailListSection,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { TableBadge } from "@/components/ui/data-table"
import {
  Briefcase,
  Building2,
  Library,
  Globe,
  FileText,
  Pencil,
  Plus,
  LayoutDashboard,
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

  const properties = (related.properties || []) as Business["properties"]
  const libraries = (related.libraries || []) as Business["libraries"]
  const entityCount = (properties?.length ?? 0) + (libraries?.length ?? 0)
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
        <InfoCard label="Entities" value={String(entityCount)} icon={Building2} />
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

      {/* Section 3: Properties */}
      <DetailListSection
        title="Properties"
        icon={Building2}
        items={properties ?? []}
        keyExtractor={(p) => p.id}
        renderItem={(p) => (
          <Link
            href={`/properties/${p.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                {p.city && <div className="text-xs text-muted-foreground">{p.city}</div>}
              </div>
            </div>
            {!p.is_active && <TableBadge variant="muted">Inactive</TableBadge>}
          </Link>
        )}
        viewAllHref="/properties"
        viewAllLabel="All Properties"
        emptyText="No properties linked to this business yet."
        actions={
          <PermissionGate permission="properties.create" hide>
            <Link href="/properties/new">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Property
              </Button>
            </Link>
          </PermissionGate>
        }
      />

      {/* Libraries */}
      <DetailListSection
        title="Libraries"
        icon={Library}
        items={libraries ?? []}
        keyExtractor={(l) => l.id}
        renderItem={(l) => (
          <Link
            href={`/library/${l.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Library className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">{l.name}</div>
                {l.city && <div className="text-xs text-muted-foreground">{l.city}</div>}
              </div>
            </div>
            {!l.is_active && <TableBadge variant="muted">Inactive</TableBadge>}
          </Link>
        )}
        viewAllHref="/library"
        viewAllLabel="All Libraries"
        emptyText="No libraries linked to this business yet."
        actions={
          <PermissionGate permission="library.create" hide>
            <Link href="/library/new">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Library
              </Button>
            </Link>
          </PermissionGate>
        }
      />
    </DetailPageTemplate>
  )
}
