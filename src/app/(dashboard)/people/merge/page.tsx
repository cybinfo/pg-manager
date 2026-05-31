"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { usePeopleMerge, PersonWithStats } from "@/lib/hooks/usePeopleMerge"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { PageSkeleton } from "@/components/ui/loading"
import { DetailHero } from "@/components/ui"
import {
  Search,
  Merge,
  ArrowRight,
  Phone,
  Mail,
  BadgeCheck,
  Ban,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Home,
  Briefcase,
  UserCircle,
  Calendar,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGuard } from "@/components/auth"
import { formatDate } from "@/lib/format"
import { Person } from "@/types/people.types"
import { logger } from "@/lib/logger"

export default function PersonMergePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("id")

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [merging, setMerging] = useState(false)
  const [selectingFor, setSelectingFor] = useState<"primary" | "secondary" | null>(null)

  const {
    loading,
    searching,
    searchQuery,
    setSearchQuery,
    searchResults,
    primaryPerson,
    setPrimaryPerson,
    secondaryPerson,
    setSecondaryPerson,
    fetchPersonWithStats,
    handleSearch,
  } = usePeopleMerge(preselectedId)

  // Select a person from search results
  const handleSelectPerson = async (person: Person) => {
    const personWithStats = await fetchPersonWithStats(person.id)
    if (!personWithStats) return

    if (selectingFor === "primary") {
      setPrimaryPerson(personWithStats)
    } else if (selectingFor === "secondary") {
      setSecondaryPerson(personWithStats)
    }

    setSelectingFor(null)
  }

  // Swap primary and secondary
  const handleSwap = () => {
    const temp = primaryPerson
    setPrimaryPerson(secondaryPerson)
    setSecondaryPerson(temp)
  }

  // Perform merge
  const handleMerge = () => {
    if (!primaryPerson || !secondaryPerson) {
      showError("Select both persons to merge")
      return
    }

    if (secondaryPerson.is_blocked && !primaryPerson.is_blocked) {
      showError("Cannot merge a blocked person into an unblocked person")
      return
    }

    confirm({
      title: "Merge People",
      description:
        `Are you sure you want to merge "${secondaryPerson.name}" into "${primaryPerson.name}"?\n\n` +
        `This will:\n` +
        `- Move all ${secondaryPerson.tenant_count || 0} tenant records to "${primaryPerson.name}"\n` +
        `- Move all ${secondaryPerson.staff_count || 0} staff records to "${primaryPerson.name}"\n` +
        `- Move all ${secondaryPerson.visitor_count || 0} visitor records to "${primaryPerson.name}"\n` +
        `- Delete "${secondaryPerson.name}" permanently\n\n` +
        `This action cannot be undone.`,
      destructive: false,
      confirmText: "Merge",
      onConfirm: async () => {
        setMerging(true)
        const supabase = createClient()

        const { data, error } = await supabase.rpc("merge_persons", {
          p_primary_id: primaryPerson.id,
          p_secondary_id: secondaryPerson.id,
        })

        if (error) {
          logger.error("Merge error:", { detail: error })
          showError(`Merge failed: ${error.message}`)
          setMerging(false)
          return
        }

        showSuccess(
          `Merged successfully! ${data.total_references_updated} records updated.`
        )
        router.push(`/people/${primaryPerson.id}`)
      },
    })
  }

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <PermissionGuard permission="tenants.update">
      <div className="space-y-6">
        {ConfirmDialogElement}
        <DetailHero
          title="Merge Duplicate People"
          subtitle="Consolidate duplicate person records — all linked data moves to the primary record"
          icon={Merge}
          backHref="/people"
          backLabel="Back to People"
          breadcrumbs={[
            { label: "People", href: "/people" },
            { label: "Merge" },
          ]}
        />

        {/* Instructions */}
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">How merging works:</p>
                <ul className="mt-1 text-warning/80 space-y-1">
                  <li>1. Select the <strong>primary person</strong> (the record to keep)</li>
                  <li>2. Select the <strong>duplicate person</strong> (will be deleted)</li>
                  <li>3. All tenant, staff, and visitor records from the duplicate will be moved to the primary</li>
                  <li>4. Missing data on primary will be filled from duplicate</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary Person */}
          <Card className={primaryPerson ? "border-success/30 bg-success/5" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    Primary (Keep)
                  </CardTitle>
                  <CardDescription>This record will be kept</CardDescription>
                </div>
                {primaryPerson && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPrimaryPerson(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {primaryPerson ? (
                <PersonCard person={primaryPerson} />
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-32"
                  onClick={() => setSelectingFor("primary")}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Select Primary Person
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Secondary Person */}
          <Card className={secondaryPerson ? "border-destructive/30 bg-destructive/5" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <X className="h-5 w-5 text-destructive" />
                    Duplicate (Delete)
                  </CardTitle>
                  <CardDescription>This record will be deleted</CardDescription>
                </div>
                {secondaryPerson && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSecondaryPerson(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {secondaryPerson ? (
                <PersonCard person={secondaryPerson} />
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-32"
                  onClick={() => setSelectingFor("secondary")}
                  disabled={!primaryPerson}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Select Duplicate Person
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Swap Button */}
        {primaryPerson && secondaryPerson && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleSwap}>
              <ArrowRight className="mr-2 h-4 w-4 rotate-90 md:rotate-0" />
              Swap Primary & Duplicate
            </Button>
          </div>
        )}

        {/* Search Panel */}
        {selectingFor && (
          <Card>
            <CardHeader>
              <CardTitle>
                Search for {selectingFor === "primary" ? "Primary" : "Duplicate"} Person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setSelectingFor(null)}>
                  Cancel
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {searchResults.map((person) => (
                    <button
                      key={person.id}
                      className="w-full p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => handleSelectPerson(person)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={person.name} src={person.photo_url} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{person.name}</span>
                            {person.is_verified && (
                              <BadgeCheck className="h-4 w-4 text-success flex-shrink-0" />
                            )}
                            {person.is_blocked && (
                              <Ban className="h-4 w-4 text-destructive flex-shrink-0" />
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
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {person.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <p className="text-center text-muted-foreground py-4">
                  No people found matching &quot;{searchQuery}&quot;
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Merge Preview */}
        {primaryPerson && secondaryPerson && (
          <Card>
            <CardHeader>
              <CardTitle>Merge Preview</CardTitle>
              <CardDescription>
                Data from &quot;{secondaryPerson.name}&quot; will be merged into &quot;{primaryPerson.name}&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Records to be moved */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <Home className="h-6 w-6 mx-auto text-info mb-2" />
                    <p className="text-2xl font-bold">{secondaryPerson.tenant_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Tenant Records</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Briefcase className="h-6 w-6 mx-auto text-success mb-2" />
                    <p className="text-2xl font-bold">{secondaryPerson.staff_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Staff Records</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <UserCircle className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">{secondaryPerson.visitor_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Visitor Records</p>
                  </div>
                </div>

                {/* Data comparison */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left font-medium">Field</th>
                        <th className="p-2 text-left font-medium text-success">Primary (Keep)</th>
                        <th className="p-2 text-left font-medium text-destructive">Duplicate (Delete)</th>
                        <th className="p-2 text-left font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <MergeRow
                        field="Phone"
                        primary={primaryPerson.phone}
                        secondary={secondaryPerson.phone}
                      />
                      <MergeRow
                        field="Email"
                        primary={primaryPerson.email}
                        secondary={secondaryPerson.email}
                      />
                      <MergeRow
                        field="Aadhaar"
                        primary={primaryPerson.aadhaar_number}
                        secondary={secondaryPerson.aadhaar_number}
                      />
                      <MergeRow
                        field="PAN"
                        primary={primaryPerson.pan_number}
                        secondary={secondaryPerson.pan_number}
                      />
                      <MergeRow
                        field="DOB"
                        primary={primaryPerson.date_of_birth ? formatDate(primaryPerson.date_of_birth) : null}
                        secondary={secondaryPerson.date_of_birth ? formatDate(secondaryPerson.date_of_birth) : null}
                      />
                      <MergeRow
                        field="Address"
                        primary={primaryPerson.permanent_address}
                        secondary={secondaryPerson.permanent_address}
                      />
                      <MergeRow
                        field="Verified"
                        primary={primaryPerson.is_verified ? "Yes" : "No"}
                        secondary={secondaryPerson.is_verified ? "Yes" : "No"}
                        resultOverride={primaryPerson.is_verified || secondaryPerson.is_verified ? "Yes" : "No"}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/people">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleMerge}
            disabled={!primaryPerson || !secondaryPerson || merging}
            className="bg-destructive hover:bg-destructive/90"
          >
            {merging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Merge className="mr-2 h-4 w-4" />
                Merge & Delete Duplicate
              </>
            )}
          </Button>
        </div>
      </div>
    </PermissionGuard>
  )
}

// Person Card Component
function PersonCard({ person }: { person: PersonWithStats }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} src={person.photo_url} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{person.name}</span>
            {person.is_verified && <BadgeCheck className="h-5 w-5 text-success" />}
            {person.is_blocked && <Ban className="h-5 w-5 text-destructive" />}
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

      {/* Tags */}
      {person.tags && person.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {person.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-info/10 rounded">
          <p className="font-semibold text-info">{person.tenant_count || 0}</p>
          <p className="text-info/80">Tenants</p>
        </div>
        <div className="p-2 bg-success/10 rounded">
          <p className="font-semibold text-success">{person.staff_count || 0}</p>
          <p className="text-success/80">Staff</p>
        </div>
        <div className="p-2 bg-purple-50 rounded">
          <p className="font-semibold text-purple-700">{person.visitor_count || 0}</p>
          <p className="text-purple-600">Visitors</p>
        </div>
      </div>

      {/* Created date */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        Created {formatDate(person.created_at)}
      </p>
    </div>
  )
}

// Merge Row Component
function MergeRow({
  field,
  primary,
  secondary,
  resultOverride,
}: {
  field: string
  primary: string | null | undefined
  secondary: string | null | undefined
  resultOverride?: string
}) {
  const result = resultOverride || primary || secondary || "-"
  const willFillFromSecondary = !primary && secondary

  return (
    <tr className={willFillFromSecondary ? "bg-warning/10" : ""}>
      <td className="p-2 font-medium">{field}</td>
      <td className="p-2">{primary || <span className="text-muted-foreground">-</span>}</td>
      <td className="p-2">{secondary || <span className="text-muted-foreground">-</span>}</td>
      <td className="p-2">
        <span className={willFillFromSecondary ? "text-warning font-medium" : ""}>
          {result}
        </span>
        {willFillFromSecondary && (
          <span className="ml-1 text-xs text-warning">(from duplicate)</span>
        )}
      </td>
    </tr>
  )
}
