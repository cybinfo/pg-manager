/**
 * People Directory Page
 *
 * Central registry for all persons - tenants, staff, visitors, service providers
 * Single source of truth for identity management
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { Avatar } from "@/components/ui/avatar"
import {
  Users,
  Search,
  Phone,
  Mail,
  Building2,
  UserPlus,
  Filter,
  BadgeCheck,
  Ban,
  Home,
  Briefcase,
  Wrench,
  UserCircle,
  MoreVertical,
  Eye,
  Edit,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Select } from "@/components/ui/form-components"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Person,
  PersonSearchResult,
  PERSON_TAGS,
} from "@/types/people.types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ============================================
// Tag Badge Component
// ============================================

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
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || "bg-slate-100 text-slate-700"}`}>
    {TAG_ICONS[tag]}
    {tag.replace("_", " ")}
  </span>
)

// ============================================
// Page Component
// ============================================

export default function PeoplePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<Person[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTag, setFilterTag] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")

  const fetchPeople = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from("people")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (filterTag) {
      query = query.contains("tags", [filterTag])
    }

    if (filterStatus === "verified") {
      query = query.eq("is_verified", true)
    } else if (filterStatus === "blocked") {
      query = query.eq("is_blocked", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching people:", error)
      toast.error("Failed to load people directory")
      setLoading(false)
      return
    }

    // Filter by search query client-side
    let filteredData: Person[] = data || []
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      filteredData = filteredData.filter(
        (p: Person) =>
          p.name.toLowerCase().includes(search) ||
          p.phone?.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search) ||
          p.aadhaar_number?.toLowerCase().includes(search) ||
          p.company_name?.toLowerCase().includes(search)
      )
    }

    setPeople(filteredData)
    setLoading(false)
  }, [searchQuery, filterTag, filterStatus])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const metrics = {
    total: people.length,
    tenants: people.filter((p) => p.tags?.includes("tenant")).length,
    staff: people.filter((p) => p.tags?.includes("staff")).length,
    visitors: people.filter((p) => p.tags?.includes("visitor")).length,
    verified: people.filter((p) => p.is_verified).length,
    blocked: people.filter((p) => p.is_blocked).length,
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <PermissionGuard permission="tenants.view">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="People Directory"
          description="Central registry for all persons - tenants, staff, visitors"
          icon={Users}
          actions={
            <Link href="/people/new">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Person
              </Button>
            </Link>
          }
        />

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.tenants}</p>
                  <p className="text-xs text-muted-foreground">Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.staff}</p>
                  <p className="text-xs text-muted-foreground">Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.visitors}</p>
                  <p className="text-xs text-muted-foreground">Visitors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.verified}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.blocked}</p>
                  <p className="text-xs text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email, Aadhaar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                options={[
                  { value: "", label: "All Roles" },
                  { value: "tenant", label: "Tenants" },
                  { value: "staff", label: "Staff" },
                  { value: "visitor", label: "Visitors" },
                  { value: "service_provider", label: "Service Providers" },
                  { value: "vip", label: "VIP" },
                ]}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "", label: "All Status" },
                  { value: "verified", label: "Verified" },
                  { value: "blocked", label: "Blocked" },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* People List */}
        {people.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No people found"
            description={searchQuery || filterTag || filterStatus
              ? "Try adjusting your search or filters"
              : "People will appear here as you add tenants, staff, and visitors"}
            action={{ label: "Add Person", href: "/people/new" }}
          />
        ) : (
          <div className="grid gap-4">
            {people.map((person) => (
              <Card
                key={person.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  person.is_blocked
                    ? "border-red-200 bg-red-50/30"
                    : person.is_verified
                    ? "border-emerald-200 bg-emerald-50/30"
                    : ""
                }`}
                onClick={() => router.push(`/people/${person.id}`)}
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

                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block text-sm text-muted-foreground">
                        <p>Added {formatDate(person.created_at)}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/people/${person.id}`)
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/people/${person.id}/edit`)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {person.tags?.includes("tenant") || (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/tenants/new?person_id=${person.id}`)
                            }}>
                              <Home className="mr-2 h-4 w-4" />
                              Add as Tenant
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/visitors/new?person_id=${person.id}`)
                          }}>
                            <UserCircle className="mr-2 h-4 w-4" />
                            Check In as Visitor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
