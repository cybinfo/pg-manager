/**
 * Person Card Component
 *
 * Displays a person's information with their roles across modules.
 * Used in lists and detail pages to show unified identity.
 */

"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Phone,
  Mail,
  Building2,
  BadgeCheck,
  Ban,
  Home,
  Briefcase,
  UserCircle,
  Wrench,
  Star,
  ExternalLink,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PersonSearchResult } from "@/types/people.types"
import { cn } from "@/lib/utils"

// Tag styling
const TAG_COLORS: Record<string, string> = {
  tenant: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
  visitor: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  frequent: "bg-yellow-100 text-yellow-700",
  vip: "bg-amber-100 text-amber-700",
  blocked: "bg-red-100 text-red-700",
  verified: "bg-emerald-100 text-emerald-700",
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  tenant: <Home className="h-3 w-3" />,
  staff: <Briefcase className="h-3 w-3" />,
  visitor: <UserCircle className="h-3 w-3" />,
  service_provider: <Wrench className="h-3 w-3" />,
  frequent: <Star className="h-3 w-3" />,
  vip: <Star className="h-3 w-3" />,
  blocked: <Ban className="h-3 w-3" />,
  verified: <BadgeCheck className="h-3 w-3" />,
}

const TagBadge = ({ tag }: { tag: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      TAG_COLORS[tag] || "bg-slate-100 text-slate-700"
    )}
  >
    {TAG_ICONS[tag]}
    {tag.replace("_", " ")}
  </span>
)

interface PersonCardProps {
  person: PersonSearchResult & {
    company_name?: string | null
  }
  onClick?: () => void
  showActions?: boolean
  compact?: boolean
  className?: string
}

export function PersonCard({
  person,
  onClick,
  showActions = true,
  compact = false,
  className,
}: PersonCardProps) {
  const hasTenantRole = person.tags?.includes("tenant")
  const hasStaffRole = person.tags?.includes("staff")
  const hasVisitorRole = person.tags?.includes("visitor")

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        <Avatar name={person.name} src={person.photo_url} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{person.name}</span>
            {person.is_verified && (
              <BadgeCheck className="h-3 w-3 text-emerald-600 flex-shrink-0" />
            )}
            {person.is_blocked && (
              <Ban className="h-3 w-3 text-red-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {person.phone && <span>{person.phone}</span>}
            {person.tags && person.tags.length > 0 && (
              <span className="text-muted-foreground">
                · {person.tags.slice(0, 2).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "transition-shadow",
        onClick && "cursor-pointer hover:shadow-md",
        person.is_blocked && "border-red-200 bg-red-50/30",
        person.is_verified && !person.is_blocked && "border-emerald-200 bg-emerald-50/30",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Avatar name={person.name} src={person.photo_url} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{person.name}</h3>
                {person.is_verified && (
                  <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                )}
                {person.is_blocked && (
                  <Ban className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                {person.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {person.phone}
                  </span>
                )}
                {person.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    {person.email}
                  </span>
                )}
                {person.company_name && (
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <Building2 className="h-3 w-3" />
                    {person.company_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {person.tags?.slice(0, 4).map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
                {person.tags && person.tags.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{person.tags.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/people/${person.id}`} onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>

                  {hasTenantRole && (
                    <DropdownMenuItem asChild>
                      <Link href={`/tenants?person_id=${person.id}`} onClick={(e) => e.stopPropagation()}>
                        <Home className="mr-2 h-4 w-4" />
                        View as Tenant
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {hasStaffRole && (
                    <DropdownMenuItem asChild>
                      <Link href={`/staff?person_id=${person.id}`} onClick={(e) => e.stopPropagation()}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        View as Staff
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {hasVisitorRole && (
                    <DropdownMenuItem asChild>
                      <Link href={`/visitors/directory?person_id=${person.id}`} onClick={(e) => e.stopPropagation()}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        View Visit History
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {!hasTenantRole && (
                    <DropdownMenuItem asChild>
                      <Link href={`/tenants/new?person_id=${person.id}`} onClick={(e) => e.stopPropagation()}>
                        <Home className="mr-2 h-4 w-4" />
                        Add as Tenant
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href={`/visitors/new?person_id=${person.id}`} onClick={(e) => e.stopPropagation()}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      Check In as Visitor
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PersonCard
