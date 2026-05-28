"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { showError } from "@/lib/toast-helpers"

export interface DuplicateGroup {
  match_type: string
  match_value: string
  duplicate_count: number
  person_ids: string[]
  person_names: string[]
}

type PersonBase = {
  id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  tags: string[] | null
  is_verified: boolean
  is_blocked: boolean
  created_at: string
}

export interface DuplicatePerson extends PersonBase {
  tenant_count: number
  staff_count: number
  visitor_count: number
}

interface UsePeopleDuplicatesReturn {
  loading: boolean
  refreshing: boolean
  duplicateGroups: DuplicateGroup[]
  expandedGroup: string | null
  setExpandedGroup: (key: string | null) => void
  groupPersons: Record<string, DuplicatePerson[]>
  loadingGroup: string | null
  fetchGroupPersons: (group: DuplicateGroup) => Promise<void>
  handleRefresh: () => void
}

export function usePeopleDuplicates(): UsePeopleDuplicatesReturn {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupPersons, setGroupPersons] = useState<Record<string, DuplicatePerson[]>>({})
  const [loadingGroup, setLoadingGroup] = useState<string | null>(null)

  const fetchDuplicates = useCallback(async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("duplicate_people_summary")
      .select("*")
      .order("duplicate_count", { ascending: false })

    if (error) {
      logger.error("Error fetching duplicates:", { detail: error })
      showError("Failed to load duplicates")
    } else {
      setDuplicateGroups(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchDuplicates()
  }, [fetchDuplicates])

  const fetchGroupPersons = useCallback(async (group: DuplicateGroup) => {
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
      logger.error("Error fetching group persons:", { detail: error })
      showError("Failed to load person details")
      setLoadingGroup(null)
      return
    }

    const personsWithCounts = await Promise.all(
      (data || []).map(async (person: PersonBase) => {
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
  }, [groupPersons, expandedGroup])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setGroupPersons({})
    setExpandedGroup(null)
    fetchDuplicates()
  }, [fetchDuplicates])

  return {
    loading,
    refreshing,
    duplicateGroups,
    expandedGroup,
    setExpandedGroup,
    groupPersons,
    loadingGroup,
    fetchGroupPersons,
    handleRefresh,
  }
}
