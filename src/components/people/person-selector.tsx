/**
 * Person Selector Component
 *
 * A reusable component for selecting an existing person or creating a new one.
 * Used by Tenant, Staff, and Visitor forms to ensure data is stored in People table.
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

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  Check,
  X,
  BadgeCheck,
  Ban,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Person, PersonSearchResult } from "@/types/people.types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
}

interface QuickCreateForm {
  name: string
  phone: string
  email: string
}

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
}: PersonSelectorProps) {
  const [search, setSearch] = useState(initialSearch)
  const [results, setResults] = useState<PersonSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateForm, setQuickCreateForm] = useState<QuickCreateForm>({
    name: "",
    phone: "",
    email: "",
  })
  const [creating, setCreating] = useState(false)

  // Fetch selected person details if ID provided
  useEffect(() => {
    if (selectedPersonId && !selectedPerson) {
      const fetchPerson = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("people")
          .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
          .eq("id", selectedPersonId)
          .single()

        if (data) {
          setSelectedPerson(data)
        }
      }
      fetchPerson()
    }
  }, [selectedPersonId, selectedPerson])

  // Search for people
  const searchPeople = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    let queryBuilder = supabase
      .from("people")
      .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
      .eq("owner_id", ownerId)
      .eq("is_active", true)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .order("name")
      .limit(10)

    // Apply tag filters
    if (filterTags && filterTags.length > 0) {
      queryBuilder = queryBuilder.overlaps("tags", filterTags)
    }

    const { data, error: searchError } = await queryBuilder

    if (searchError) {
      console.error("Search error:", searchError)
      setResults([])
    } else {
      // Client-side filter for excluded tags
      let filtered = data || []
      if (excludeTags && excludeTags.length > 0) {
        filtered = filtered.filter(
          (p: PersonSearchResult) => !p.tags?.some((t: string) => excludeTags.includes(t))
        )
      }
      setResults(filtered)
    }

    setLoading(false)
  }, [ownerId, filterTags, excludeTags])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        searchPeople(search)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, isOpen, searchPeople])

  // Handle person selection
  const handleSelect = (person: PersonSearchResult) => {
    setSelectedPerson(person)
    onSelect(person)
    setIsOpen(false)
    setSearch("")
  }

  // Handle quick create
  const handleQuickCreate = async () => {
    if (!quickCreateForm.name.trim()) {
      toast.error("Name is required")
      return
    }

    if (!quickCreateForm.phone && !quickCreateForm.email) {
      toast.error("Phone or email is required")
      return
    }

    setCreating(true)
    const supabase = createClient()

    // Check for existing person with same phone/email
    let existingQuery = supabase
      .from("people")
      .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
      .eq("owner_id", ownerId)

    if (quickCreateForm.phone) {
      existingQuery = existingQuery.eq("phone", quickCreateForm.phone)
    } else if (quickCreateForm.email) {
      existingQuery = existingQuery.eq("email", quickCreateForm.email)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    if (existing) {
      toast.info("Person already exists with this phone/email")
      handleSelect(existing)
      setCreating(false)
      setShowQuickCreate(false)
      return
    }

    // Create new person
    const { data: newPerson, error: createError } = await supabase
      .from("people")
      .insert({
        owner_id: ownerId,
        name: quickCreateForm.name.trim(),
        phone: quickCreateForm.phone || null,
        email: quickCreateForm.email || null,
        tags: [],
        source: "manual",
      })
      .select("id, name, phone, email, photo_url, tags, is_verified, is_blocked, created_at")
      .single()

    if (createError) {
      console.error("Create error:", createError)
      toast.error("Failed to create person")
      setCreating(false)
      return
    }

    toast.success("Person created successfully")
    handleSelect(newPerson)
    onCreate?.(newPerson as Person)
    setCreating(false)
    setShowQuickCreate(false)
    setQuickCreateForm({ name: "", phone: "", email: "" })
  }

  // Clear selection
  const handleClear = () => {
    setSelectedPerson(null)
    setSearch("")
    onSelect(null as unknown as PersonSearchResult)
  }

  // If person is selected, show selection card
  if (selectedPerson) {
    return (
      <div className="space-y-2">
        <Card className={cn(
          "border-2",
          error ? "border-red-300" : "border-primary/30 bg-primary/5"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={selectedPerson.name} src={selectedPerson.photo_url} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{selectedPerson.name}</span>
                    {selectedPerson.is_verified && (
                      <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {selectedPerson.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedPerson.phone}
                      </span>
                    )}
                    {selectedPerson.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {selectedPerson.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className={cn("pl-10 pr-10", error && "border-red-300")}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && isOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-64 overflow-hidden">
            <CardContent className="p-0">
              {results.length > 0 ? (
                <div className="max-h-56 overflow-y-auto">
                  {results.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                      onClick={() => handleSelect(person)}
                    >
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
                      <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ) : search.length >= 2 && !loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No people found matching "{search}"
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              )}

              {/* Quick Create Option */}
              {allowQuickCreate && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowQuickCreate(true)
                      setIsOpen(false)
                      // Pre-fill name if search looks like a name
                      if (search && !search.includes("@") && !/^\d+$/.test(search)) {
                        setQuickCreateForm((prev) => ({ ...prev, name: search }))
                      }
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Person
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Create Form */}
      {showQuickCreate && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New Person</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm({ name: "", phone: "", email: "" })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Full Name *"
                value={quickCreateForm.name}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Phone Number"
                value={quickCreateForm.phone}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <Input
                type="email"
                placeholder="Email"
                value={quickCreateForm.email}
                onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickCreateForm({ name: "", phone: "", email: "" })
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleQuickCreate}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create & Select
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {required && !selectedPerson && (
        <p className="text-xs text-muted-foreground">
          Search and select a person, or add a new one
        </p>
      )}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default PersonSelector
