"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { showError } from "@/lib/toast-helpers"
import { Person } from "@/types/people.types"

export interface PersonWithStats extends Person {
  tenant_count?: number
  staff_count?: number
  visitor_count?: number
}

interface UsePeopleMergeReturn {
  loading: boolean
  searching: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: PersonWithStats[]
  primaryPerson: PersonWithStats | null
  setPrimaryPerson: (p: PersonWithStats | null) => void
  secondaryPerson: PersonWithStats | null
  setSecondaryPerson: (p: PersonWithStats | null) => void
  fetchPersonWithStats: (id: string) => Promise<PersonWithStats | null>
  handleSearch: () => Promise<void>
}

export function usePeopleMerge(preselectedId: string | null): UsePeopleMergeReturn {
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<PersonWithStats[]>([])
  const [primaryPerson, setPrimaryPerson] = useState<PersonWithStats | null>(null)
  const [secondaryPerson, setSecondaryPerson] = useState<PersonWithStats | null>(null)

  const fetchPersonWithStats = useCallback(async (id: string): Promise<PersonWithStats | null> => {
    const supabase = createClient()

    const { data: person } = await supabase
      .from("people")
      .select("*")
      .eq("id", id)
      .single()

    if (!person) return null

    const [tenantRes, staffRes, visitorRes] = await Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("person_id", id),
      supabase.from("staff_members").select("id", { count: "exact", head: true }).eq("person_id", id),
      supabase.from("visitor_contacts").select("id", { count: "exact", head: true }).eq("person_id", id),
    ])

    return {
      ...person,
      tenant_count: tenantRes.count || 0,
      staff_count: staffRes.count || 0,
      visitor_count: visitorRes.count || 0,
    }
  }, [])

  useEffect(() => {
    const loadPreselected = async () => {
      if (preselectedId) {
        const person = await fetchPersonWithStats(preselectedId)
        if (person) {
          setPrimaryPerson(person)
        }
      }
      setLoading(false)
    }
    loadPreselected()
  }, [preselectedId, fetchPersonWithStats])

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("people")
      .select("*")
      .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .order("name")
      .limit(20)

    if (error) {
      logger.error("Search error:", { detail: error })
      showError("Search failed")
    } else {
      const filtered = (data || []).filter(
        (p: Person) => p.id !== primaryPerson?.id && p.id !== secondaryPerson?.id
      )
      setSearchResults(filtered)
    }

    setSearching(false)
  }, [searchQuery, primaryPerson, secondaryPerson])

  return {
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
  }
}
