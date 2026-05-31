"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useDetailPage, LOCATION_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Location } from "@/types/business.types"
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
  MapPin,
  Phone,
  Mail,
  Clock,
  Briefcase,
  Pencil,
  Plus,
  Building2,
  Library,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"

interface PropertySummary {
  id: string
  name: string
  address: string | null
  city: string | null
  is_active: boolean
  created_at: string
}

interface LibrarySummary {
  id: string
  name: string
  address: string | null
  city: string | null
  is_active: boolean
  created_at: string
}

export default function LocationDetailPage() {
  const params = useParams()
  const { backHref, backLabel } = useBackNavigation({
    defaultHref: "/locations",
    defaultLabel: "All Locations",
  })

  const { data: location, related, loading } = useDetailPage<Location>({
    config: LOCATION_DETAIL_CONFIG,
    id: params.id as string,
  })

  if (loading) return <PageLoading message="Loading location details..." />
  if (!location) return <NotFoundState title="Location not found" backHref="/locations" backLabel="All Locations" />

  const properties = (related.properties || []) as PropertySummary[]
  const libraries = (related.libraries || []) as LibrarySummary[]
  const totalOperations = properties.length + libraries.length

  const mapsUrl = location.latitude && location.longitude
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : location.address
    ? `https://www.google.com/maps/search/${encodeURIComponent([location.address, location.city, location.state].filter(Boolean).join(", "))}`
    : null

  return (
    <DetailPageTemplate
      layoutKey="location-detail"
      entityType="location"
      record={location as unknown as import("@/types/audit.types").AuditableEntity & { id: string }}
    >
      <DetailHero
        title={location.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {(location.city || location.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {location.city}{location.state && `, ${location.state}`}
              </span>
            )}
            {location.is_primary && <TableBadge variant="info">Primary</TableBadge>}
            {location.is_active ? (
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
          { label: "Locations", href: "/locations" },
          { label: location.name },
        ]}
        actions={
          <PermissionGate permission="locations.edit" hide>
            <Link href={`/locations/${location.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </PermissionGate>
        }
      />

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {location.business && (
          <InfoCard
            label="Business"
            value={location.business.name}
            icon={Briefcase}
          />
        )}
        <InfoCard
          label="Operations"
          value={`${totalOperations} (${properties.length} PG, ${libraries.length} Library)`}
          icon={Building2}
        />
        {(location.opening_time && location.closing_time) ? (
          <InfoCard
            label="Hours"
            value={`${location.opening_time} – ${location.closing_time}`}
            icon={Clock}
          />
        ) : null}
        <InfoCard
          label="Added"
          value={formatDate(location.created_at)}
          icon={MapPin}
        />
      </div>

      {/* Address */}
      <DetailSection title="Address" icon={MapPin}>
        {location.address && <InfoRow label="Street" value={location.address} />}
        {location.city && <InfoRow label="City" value={location.city} />}
        {location.state && <InfoRow label="State" value={location.state} />}
        {location.pincode && <InfoRow label="Pincode" value={location.pincode} />}
        <InfoRow label="Country" value={location.country || "India"} />
        {mapsUrl && (
          <div className="pt-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on Google Maps
            </a>
          </div>
        )}
        {!location.address && !location.city && !location.state && (
          <p className="text-sm text-muted-foreground">No address added yet.</p>
        )}
      </DetailSection>

      {/* Contact & Hours */}
      <DetailSection title="Contact & Hours" icon={Phone}>
        {location.phone && (
          <InfoRow
            label="Phone"
            value={
              <a href={`tel:${location.phone}`} className="text-primary hover:underline">
                {location.phone}
              </a>
            }
          />
        )}
        {location.email && (
          <InfoRow
            label="Email"
            value={
              <a href={`mailto:${location.email}`} className="text-primary hover:underline">
                {location.email}
              </a>
            }
          />
        )}
        {location.opening_time && location.closing_time && (
          <InfoRow
            label="Operating Hours"
            value={`${location.opening_time} – ${location.closing_time}`}
          />
        )}
        {!location.phone && !location.email && !location.opening_time && (
          <p className="text-sm text-muted-foreground">No contact details added yet.</p>
        )}
      </DetailSection>

      {/* PG Properties at this location */}
      <DetailListSection
        title="PG Properties"
        icon={Building2}
        items={properties}
        keyExtractor={(p) => p.id}
        renderItem={(p) => (
          <Link
            href={`/properties/${p.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm">{p.name}</span>
            </div>
            {!p.is_active && <TableBadge variant="muted">Inactive</TableBadge>}
          </Link>
        )}
        viewAllHref={`/properties?location_id=${location.id}`}
        viewAllLabel="All Properties"
        emptyText="No PG properties at this location."
        actions={
          <PermissionGate permission="properties.create" hide>
            <Link href={`/properties/new?location_id=${location.id}`}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add PG
              </Button>
            </Link>
          </PermissionGate>
        }
      />

      {/* Libraries at this location */}
      <DetailListSection
        title="Libraries"
        icon={Library}
        items={libraries}
        keyExtractor={(lib) => lib.id}
        renderItem={(lib) => (
          <Link
            href={`/library/${lib.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Library className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm">{lib.name}</span>
            </div>
            {!lib.is_active && <TableBadge variant="muted">Inactive</TableBadge>}
          </Link>
        )}
        viewAllHref={`/library?location_id=${location.id}`}
        viewAllLabel="All Libraries"
        emptyText="No libraries at this location."
        actions={
          <PermissionGate permission="library.create" hide>
            <Link href={`/library/new?location_id=${location.id}`}>
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
