/**
 * Person Selector Component
 *
 * A reusable component for selecting an existing person or creating a new one.
 * Used by Tenant, Staff, and Visitor forms to ensure data is stored in People table.
 *
 * Thin wrapper around EntitySelector with person-specific rendering and tag filtering.
 *
 * Usage:
 * <PersonSelector
 *   ownerId={ownerId}
 *   selectedPersonId={personId}
 *   onSelect={(person) => setPersonId(person.id)}
 *   onCreate={(person) => setPersonId(person.id)}
 *   filterTags={['tenant']} // Optional: filter to show only people with these tags
 *   excludeTags={['blocked']} // Optional: exclude people with these tags
 * />
 */

"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import {
  UserPlus,
  Phone,
  Mail,
  X,
  BadgeCheck,
  Ban,
  ExternalLink,
  FileText,
  MapPin,
  Briefcase,
} from "lucide-react"
import Link from "next/link"
import { Person, PersonSearchResult } from "@/types/people.types"
import { showInfo } from "@/lib/toast-helpers"
import { showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { cn } from "@/lib/utils"
import {
  EntitySelector,
  type EntitySelectorConfig,
} from "@/components/ui/entity-selector"

// ============================================================================
// PROPS (preserved exactly as before)
// ============================================================================

interface PersonSelectorProps {
  ownerId: string
  selectedPersonId?: string | null
  onSelect: (person: PersonSearchResult) => void
  onCreate?: (person: Person) => void
  filterTags?: string[]
  excludeTags?: string[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  /** Show quick create form inline */
  allowQuickCreate?: boolean
  /** Pre-fill search with this value */
  initialSearch?: string
  /** Show "Edit in People" link when person is selected */
  showEditLink?: boolean
  /** Show detailed person info (ID docs, address, etc) when selected */
  showDetailedInfo?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERSON_SELECT_FIELDS = `
  id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at,
  id_documents, company_name, occupation, emergency_contacts,
  permanent_address, permanent_city, current_address
`

// ============================================================================
// HELPER RENDERERS (person-specific UI)
// ============================================================================

/** Render a person in the dropdown list */
function PersonDropdownItem({ person }: { person: PersonSearchResult }) {
  return (
    <>
      <Avatar name={person.name} src={person.photo_url} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{person.name}</span>
          {person.is_verified && (
            <BadgeCheck className="h-3 w-3 text-emerald-600" />
          )}
          {person.is_blocked && (
            <Ban className="h-3 w-3 text-red-600" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {person.phone && <span>{person.phone}</span>}
          {person.phone && person.email && <span>·</span>}
          {person.email && <span className="truncate">{person.email}</span>}
        </div>
      </div>
    </>
  )
}

/** Render the selected person card with optional detailed info */
function PersonSelectedCard({
  person,
  onClear,
  disabled,
  error,
  showEditLink,
  showDetailedInfo,
}: {
  person: PersonSearchResult
  onClear: () => void
  disabled: boolean
  error?: string
  showEditLink: boolean
  showDetailedInfo: boolean
}) {
  const hasIdDocuments = person.id_documents && person.id_documents.length > 0
  const hasAddress = person.permanent_address || person.current_address

  return (
    <div className="space-y-2">
      <Card className={cn(
        "border-2",
        error ? "border-red-300" : "border-primary/30 bg-primary/5"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={person.name} src={person.photo_url} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{person.name}</span>
                  {person.is_verified && (
                    <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
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
            <div className="flex items-center gap-1">
              {showEditLink && (
                <Link href={`/people/${person.id}/edit`} target="_blank">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Edit in People
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClear}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Detailed info section */}
          {showDetailedInfo && (
            <div className="mt-3 pt-3 border-t border-primary/10 space-y-2">
              {hasIdDocuments && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">ID Documents: </span>
                    {person.id_documents?.map((doc, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        {i > 0 && ", "}
                        {doc.type}
                        {doc.verified && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(person.company_name || person.occupation) && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {person.occupation}
                    {person.company_name && ` at ${person.company_name}`}
                  </span>
                </div>
              )}

              {hasAddress && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">
                    {person.current_address || person.permanent_address}
                    {person.permanent_city && `, ${person.permanent_city}`}
                  </span>
                </div>
              )}

              {!hasIdDocuments && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  <FileText className="h-4 w-4" />
                  <span>No ID documents on file.</span>
                  {showEditLink && (
                    <Link href={`/people/${person.id}/edit`} target="_blank" className="underline">
                      Add in People
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PersonSelector({
  ownerId,
  selectedPersonId,
  onSelect,
  onCreate,
  filterTags,
  excludeTags = ["blocked"],
  placeholder = "Search by name, phone, or email...",
  disabled = false,
  required = false,
  error,
  allowQuickCreate = true,
  initialSearch = "",
  showEditLink = true,
  showDetailedInfo = false,
}: PersonSelectorProps) {
  // Build the config, memoized on stable deps
  const config: EntitySelectorConfig<PersonSearchResult> = useMemo(() => ({
    table: "people",
    select: PERSON_SELECT_FIELDS,
    searchColumns: ["name", "phone", "email"],
    orderBy: "name",
    limit: 10,
    minSearchLength: 2,
    scopeColumn: "owner_id",
    staticFilters: [
      { column: "is_active", op: "eq" as const, value: true },
    ],
    entityLabel: "Person",
    quickCreateIcon: <><UserPlus className="mr-2 h-4 w-4" /></>,
    searchHint: "Search and select a person, or add a new one",

    // Render dropdown item
    renderItem: (person: PersonSearchResult) => <PersonDropdownItem person={person} />,

    // Render selected card
    renderSelected: (
      person: PersonSearchResult,
      opts: { onClear: () => void; disabled: boolean; error?: string }
    ) => (
      <PersonSelectedCard
        person={person}
        onClear={opts.onClear}
        disabled={opts.disabled}
        error={opts.error}
        showEditLink={showEditLink}
        showDetailedInfo={showDetailedInfo}
      />
    ),

    getDisplayName: (person: PersonSearchResult) => person.name,

    // Quick create fields
    quickCreateFields: [
      { key: "name", placeholder: "Full Name *", required: true },
      { key: "phone", placeholder: "Phone Number" },
      { key: "email", placeholder: "Email", type: "email" },
    ],
    quickCreateDefaults: { name: "", phone: "", email: "" },

    // Pre-fill name from search if it looks like a name (not email or number)
    prefillNameFromSearch: (search: string) =>
      !!search && !search.includes("@") && !/^\d+$/.test(search),

    // Quick create handler with duplicate detection
    onQuickCreate: async (formData, supabase, userId, scopeId) => {
      if (!formData.phone && !formData.email) {
        showError("Phone or email is required")
        return null
      }

      // Check for existing person with same phone/email
      let existingQuery = supabase
        .from("people")
        .select(PERSON_SELECT_FIELDS)
        .eq("owner_id", scopeId)

      if (formData.phone) {
        existingQuery = existingQuery.eq("phone", formData.phone)
      } else if (formData.email) {
        existingQuery = existingQuery.eq("email", formData.email)
      }

      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        showInfo("Person already exists with this phone/email")
        // Return the existing person - EntitySelector will select it
        return existing as PersonSearchResult
      }

      // Create new person
      const { data: newPerson, error: createError } = await supabase
        .from("people")
        .insert(
          withCreatedBy({
            owner_id: scopeId,
            name: formData.name.trim(),
            phone: formData.phone || null,
            email: formData.email || null,
            tags: [],
            source: "manual",
          }, userId)
        )
        .select(PERSON_SELECT_FIELDS)
        .single()

      if (createError) {
        console.error("Create error:", createError)
        showError("Failed to create person")
        return null
      }

      onCreate?.(newPerson as Person)
      return newPerson as PersonSearchResult
    },

    // Person-specific: tag filtering
    applyExtraFilters: (query, extra) => {
      if (extra.filterTags && extra.filterTags.length > 0) {
        return query.overlaps("tags", extra.filterTags)
      }
      return query
    },

    // Person-specific: exclude tags client-side
    clientFilter: (items, extra) => {
      if (extra.excludeTags && extra.excludeTags.length > 0) {
        return items.filter(
          (p: PersonSearchResult) => !p.tags?.some((t: string) => extra.excludeTags.includes(t))
        )
      }
      return items
    },

    noResultsMessage: (search: string) => `No people found matching "${search}"`,
    emptyMessage: "Type at least 2 characters to search",
  }), [showEditLink, showDetailedInfo, onCreate])

  const extraFilterData = useMemo(
    () => ({ filterTags, excludeTags }),
    [filterTags, excludeTags]
  )

  return (
    <EntitySelector<PersonSearchResult>
      config={config}
      scopeId={ownerId}
      userId={ownerId}
      selectedId={selectedPersonId}
      onSelect={(person) => onSelect(person as PersonSearchResult)}
      onCreate={onCreate as ((item: PersonSearchResult) => void) | undefined}
      allowQuickCreate={allowQuickCreate}
      disabled={disabled}
      error={error}
      required={required}
      placeholder={placeholder}
      initialSearch={initialSearch}
      extraFilterData={extraFilterData}
    />
  )
}

export default PersonSelector
