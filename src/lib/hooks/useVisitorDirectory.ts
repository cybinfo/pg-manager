"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { showError } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"
import { type VisitorContact } from "@/types/visitors.types"

export function useVisitorDirectory() {
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<VisitorContact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")

  const fetchContacts = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from("visitor_contacts")
      .select("*")
      .order("visit_count", { ascending: false })
      .order("last_visit_at", { ascending: false, nullsFirst: false })

    if (filterType) {
      query = query.eq("visitor_type", filterType)
    }

    if (filterStatus === "frequent") {
      query = query.eq("is_frequent", true)
    } else if (filterStatus === "blocked") {
      query = query.eq("is_blocked", true)
    }

    const { data, error } = await query

    if (error) {
      logger.error("Error fetching contacts:", { detail: error })
      showError("Failed to load visitor directory")
      return
    }

    // Filter by search query client-side
    let filteredData: VisitorContact[] = data || []
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      filteredData = filteredData.filter(
        (c: VisitorContact) =>
          c.name.toLowerCase().includes(search) ||
          c.phone?.toLowerCase().includes(search) ||
          c.company_name?.toLowerCase().includes(search)
      )
    }

    setContacts(filteredData)
    setLoading(false)
  }, [searchQuery, filterType, filterStatus])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    loading,
    contacts,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    fetchContacts,
  }
}
