/**
 * Duplicate People Detection Page
 *
 * Shows automatically detected duplicate person records
 * Allows quick merging of duplicates
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { PageLoader } from "@/components/ui/page-loader"
import { EmptyState } from "@/components/ui/empty-state"
import {
  ArrowLeft,
  AlertTriangle,
  Phone,
  Mail,
  CreditCard,
  Merge,
  BadgeCheck,
  Ban,
  Home,
  Briefcase,
  UserCircle,
  RefreshCw,
  CheckCircle2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/auth"
import { formatDate } from "@/lib/format"

interface DuplicateGroup {
  match_type: string
  match_value: string
  duplicate_count: number
  person_ids: string[]
  person_names: string[]
}

interface DuplicatePerson {
  id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  tags: string[] | null
  is_verified: boolean
  is_blocked: boolean
  created_at: string
  tenant_count: number
  staff_count: number
  visitor_count: number
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  phone: "Same Phone Number",
  email: "Same Email Address",
  aadhaar: "Same Aadhaar Number",
}

const MATCH_TYPE_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  aadhaar: <CreditCard className="h-4 w-4" />,
}

const MATCH_TYPE_COLORS: Record<string, string> = {
  phone: "bg-blue-100 text-blue-700 border-blue-300",
  email: "bg-purple-100 text-purple-700 border-purple-300",
  aadhaar: "bg-orange-100 text-orange-700 border-orange-300",
}

export default function DuplicatesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupPersons, setGroupPersons] = useState<Record<string, DuplicatePerson[]>>({})
  const [loadingGroup, setLoadingGroup] = useState<string | null>(null)

  // Fetch duplicate groups
  const fetchDuplicates = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("duplicate_people_summary")
      .select("*")
      .order("duplicate_count", { ascending: false })

    if (error) {
      console.error("Error fetching duplicates:", error)
      toast.error("Failed to load duplicates")
    } else {
      setDuplicateGroups(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  // Fetch persons for a group
  const fetchGroupPersons = async (group: DuplicateGroup) => {
    const groupKey = `${group.match_type}-${group.match_value}`

    if (groupPersons[groupKey]) {
      setExpandedGroup(expandedGroup === groupKey ? null : groupKey)
      return
    }

    setLoadingGroup(groupKey)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("people")
      .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
      .in("id", group.person_ids)
      .order("created_at")

    if (error) {
      console.error("Error fetching group persons:", error)
      toast.error("Failed to load person details")
      setLoadingGroup(null)
      return
    }

    // Fetch counts for each person
    type PersonData = { id: string; name: string; phone: string | null; email: string | null; photo_url: string | null; tags: string[] | null; is_verified: boolean; is_blocked: boolean; created_at: string }
    const personsWithCounts = await Promise.all(
      (data || []).map(async (person: PersonData) => {
        const [tenantRes, staffRes, visitorRes] = await Promise.all([
          supabase.from("tenants").select("id", { count: "exact", head: true }).eq("person_id", person.id),
          supabase.from("staff_members").select("id", { count: "exact", head: true }).eq("person_id", person.id),
          supabase.from("visitor_contacts").select("id", { count: "exact", head: true }).eq("person_id", person.id),
        ])

        return {
          ...person,
          tenant_count: tenantRes.count || 0,
          staff_count: staffRes.count || 0,
          visitor_count: visitorRes.count || 0,
        }
      })
    )

    setGroupPersons((prev) => ({
      ...prev,
      [groupKey]: personsWithCounts,
    }))
    setExpandedGroup(groupKey)
    setLoadingGroup(null)
  }

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    setGroupPersons({})
    setExpandedGroup(null)
    fetchDuplicates()
  }

  // Navigate to merge with preselected persons
  const handleMerge = (persons: DuplicatePerson[]) => {
    if (persons.length < 2) return

    // Sort by: verified first, then by most records, then by oldest
    const sorted = [...persons].sort((a, b) => {
      if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1
      const aTotal = a.tenant_count + a.staff_count + a.visitor_count
      const bTotal = b.tenant_count + b.staff_count + b.visitor_count
      if (aTotal !== bTotal) return bTotal - aTotal
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    // Navigate to merge page with primary preselected
    router.push(`/people/merge?id=${sorted[0].id}`)
  }

  if (loading) {
    return <PageLoader />
  }

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicate_count, 0)

  return (
    <PermissionGuard permission="tenants.view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/people">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Duplicate Detection</h1>
              <p className="text-muted-foreground">
                {duplicateGroups.length > 0
                  ? `Found ${duplicateGroups.length} potential duplicate groups`
                  : "No duplicates detected"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary */}
        {duplicateGroups.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{duplicateGroups.length}</p>
                    <p className="text-xs text-muted-foreground">Duplicate Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {duplicateGroups.filter((g) => g.match_type === "phone").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Phone Matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {duplicateGroups.filter((g) => g.match_type === "email").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Email Matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {duplicateGroups.filter((g) => g.match_type === "aadhaar").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Aadhaar Matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Duplicate Groups */}
        {duplicateGroups.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No Duplicates Found"
            description="Great! No duplicate person records were detected."
          />
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group) => {
              const groupKey = `${group.match_type}-${group.match_value}`
              const isExpanded = expandedGroup === groupKey
              const persons = groupPersons[groupKey]

              return (
                <Card key={groupKey} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fetchGroupPersons(group)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${MATCH_TYPE_COLORS[group.match_type]?.split(" ")[0] || "bg-slate-100"}`}>
                          {MATCH_TYPE_ICONS[group.match_type]}
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {MATCH_TYPE_LABELS[group.match_type] || group.match_type}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${MATCH_TYPE_COLORS[group.match_type] || "bg-slate-100 text-slate-700"}`}>
                              {group.duplicate_count} people
                            </span>
                          </CardTitle>
                          <CardDescription className="font-mono">
                            {group.match_value}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingGroup === groupKey ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {isExpanded ? "Click to collapse" : "Click to expand"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && persons && (
                    <CardContent className="border-t pt-4">
                      <div className="space-y-4">
                        {/* Person cards */}
                        <div className="grid gap-3">
                          {persons.map((person, index) => (
                            <div
                              key={person.id}
                              className={`p-3 border rounded-lg ${index === 0 ? "border-green-300 bg-green-50/50" : ""}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar name={person.name} src={person.photo_url} size="md" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{person.name}</span>
                                      {person.is_verified && (
                                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                      )}
                                      {person.is_blocked && (
                                        <Ban className="h-4 w-4 text-red-600" />
                                      )}
                                      {index === 0 && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                          Recommended Primary
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      {person.phone && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {person.phone}
                                        </span>
                                      )}
                                      {person.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {person.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {/* Record counts */}
                                  <div className="flex items-center gap-3 text-xs">
                                    {person.tenant_count > 0 && (
                                      <span className="flex items-center gap-1 text-blue-600">
                                        <Home className="h-3 w-3" />
                                        {person.tenant_count}
                                      </span>
                                    )}
                                    {person.staff_count > 0 && (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <Briefcase className="h-3 w-3" />
                                        {person.staff_count}
                                      </span>
                                    )}
                                    {person.visitor_count > 0 && (
                                      <span className="flex items-center gap-1 text-purple-600">
                                        <UserCircle className="h-3 w-3" />
                                        {person.visitor_count}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    Created {formatDate(person.created_at)}
                                  </span>
                                  <Link href={`/people/${person.id}`}>
                                    <Button variant="ghost" size="sm">
                                      View
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Merge action */}
                        <div className="flex justify-end pt-2 border-t">
                          <Button onClick={() => handleMerge(persons)}>
                            <Merge className="mr-2 h-4 w-4" />
                            Merge These People
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
