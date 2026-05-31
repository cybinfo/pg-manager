"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, ENTITY_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { TableBadge } from "@/components/ui/data-table"
import { PermissionGate } from "@/components/auth"
import type { Entity } from "@/types/entity.types"
import { ENTITY_TYPE_LABELS } from "@/types/entity.types"
import {
  Building2,
  Library,
  MapPin,
  Phone,
  Mail,
  Clock,
  Armchair,
  Users,
  Lock,
  Grid3X3,
  Home,
  Pencil,
  IndianRupee,
  BarChart3,
  Wifi,
  Car,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { brandGradient } from "@/lib/design-tokens"

const TYPE_ICON: Record<string, LucideIcon> = {
  pg: Building2,
  library: Library,
}

const TYPE_VARIANT: Record<string, "info" | "success" | "warning" | "muted"> = {
  pg: "info",
  library: "success",
}

export default function EntityDetailPage() {
  const params = useParams()

  const { data: entity, loading } = useDetailPage<Entity>({
    config: ENTITY_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/entities", defaultLabel: "All Entities" })

  if (loading) {
    return <PageLoading message="Loading entity details..." />
  }

  if (!entity) {
    return <NotFoundState title="Entity not found" backHref="/entities" backLabel="All Entities" />
  }

  const isPG = entity.type === "pg"
  const isLibrary = entity.type === "library"
  const EntityIcon = TYPE_ICON[entity.type] || Building2

  const settings = (entity.settings || {}) as Record<string, unknown>

  return (
    <div className="space-y-6">
      <DetailHero
        title={entity.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <TableBadge variant={TYPE_VARIANT[entity.type] || "muted"}>
              {ENTITY_TYPE_LABELS[entity.type] || entity.type}
            </TableBadge>
            {entity.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {entity.city}{entity.state && `, ${entity.state}`}
              </span>
            )}
            {entity.code && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{entity.code}</span>
            )}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Entities", href: "/entities" },
          { label: entity.name || "Entity Detail" },
        ]}
        status={entity.is_active ? "active" : "inactive"}
        avatar={
          <div className={`p-3 ${brandGradient.solid} rounded-lg`}>
            <EntityIcon className="h-8 w-8 text-white" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PermissionGate permission="properties.edit" hide>
              <Link href={`/entities/${entity.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            {isPG && (
              <Link href={`/properties/${entity.id}`}>
                <Button size="sm">
                  <Building2 className="mr-2 h-4 w-4" />
                  PG Dashboard
                </Button>
              </Link>
            )}
            {isLibrary && (
              <Link href={`/library/${entity.id}`}>
                <Button size="sm">
                  <Library className="mr-2 h-4 w-4" />
                  Library Dashboard
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <DetailPageTemplate layoutKey="entity-detail" entityType="entity" record={entity}>
        {/* Entity Info */}
        <DetailSection
          title="Entity Details"
          description="Location and contact information"
          icon={EntityIcon}
        >
          {entity.address && (
            <InfoRow label="Address" value={entity.address} icon={MapPin} />
          )}
          {entity.city && <InfoRow label="City" value={entity.city} />}
          {entity.state && <InfoRow label="State" value={entity.state} />}
          {entity.pincode && <InfoRow label="Pincode" value={entity.pincode} />}
          {entity.phone && (
            <InfoRow
              label="Phone"
              value={
                <a href={`tel:${entity.phone}`} className="text-primary hover:underline">
                  {entity.phone}
                </a>
              }
              icon={Phone}
            />
          )}
          {entity.email && (
            <InfoRow
              label="Email"
              value={
                <a href={`mailto:${entity.email}`} className="text-primary hover:underline">
                  {entity.email}
                </a>
              }
              icon={Mail}
            />
          )}
          {entity.manager_name && (
            <InfoRow label="Manager" value={entity.manager_name} icon={User} />
          )}
          {entity.manager_phone && (
            <InfoRow
              label="Manager Phone"
              value={
                <a href={`tel:${entity.manager_phone}`} className="text-primary hover:underline">
                  {entity.manager_phone}
                </a>
              }
              icon={Phone}
            />
          )}
          {isLibrary && entity.opening_time && entity.closing_time && (
            <InfoRow
              label="Hours"
              value={`${entity.opening_time.slice(0, 5)} - ${entity.closing_time.slice(0, 5)}`}
              icon={Clock}
            />
          )}
          {isLibrary && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {Boolean(settings.has_ac) && (
                <span className="px-2 py-1 bg-info/10 text-info rounded text-sm font-medium">AC</span>
              )}
              {Boolean(settings.has_wifi) && (
                <span className="px-2 py-1 bg-success/10 text-success rounded text-sm font-medium flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  WiFi
                </span>
              )}
              {Boolean(settings.has_lockers) && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded text-sm font-medium flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Lockers
                </span>
              )}
              {Boolean(settings.has_parking) && (
                <span className="px-2 py-1 bg-warning/10 text-warning rounded text-sm font-medium flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  Parking
                </span>
              )}
            </div>
          )}
        </DetailSection>

        {/* PG Quick Links */}
        {isPG && (
          <DetailSection
            title="PG Management"
            description="Quick access to PG modules"
            icon={Building2}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Rooms", icon: Home, href: `/rooms?property=${entity.id}` },
                { label: "Tenants", icon: Users, href: `/tenants?property=${entity.id}` },
                { label: "Bills", icon: IndianRupee, href: `/bills?property=${entity.id}` },
                { label: "Payments", icon: IndianRupee, href: `/payments?property=${entity.id}` },
                { label: "Reports", icon: BarChart3, href: `/reports?property=${entity.id}` },
                { label: "Full Detail", icon: Building2, href: `/properties/${entity.id}` },
              ].map((link) => {
                const Icon = link.icon
                return (
                  <Link key={link.label} href={link.href}>
                    <div className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all text-center">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{link.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </DetailSection>
        )}

        {/* Library Quick Links */}
        {isLibrary && (
          <DetailSection
            title="Library Management"
            description="Quick access to library modules"
            icon={Library}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Sections", icon: Grid3X3, href: `/library-sections?library=${entity.id}` },
                { label: "Seats", icon: Armchair, href: `/library-seats?library=${entity.id}` },
                { label: "Members", icon: Users, href: `/library-members?library=${entity.id}` },
                { label: "Attendance", icon: Clock, href: `/library-attendance?library=${entity.id}` },
                { label: "Lockers", icon: Lock, href: `/library-lockers?library=${entity.id}` },
                { label: "Full Detail", icon: Library, href: `/library/${entity.id}` },
              ].map((link) => {
                const Icon = link.icon
                return (
                  <Link key={link.label} href={link.href}>
                    <div className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all text-center">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{link.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </DetailSection>
        )}
      </DetailPageTemplate>
    </div>
  )
}
