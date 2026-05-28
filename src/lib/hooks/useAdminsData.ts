import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { showError } from "@/lib/toast-helpers"

export interface AdminRow {
  user_id: string
  created_at: string
  created_by: string | null
  notes: string | null
  profile: {
    name: string
    email: string | null
  } | null
}

type AdminRecord = { user_id: string; created_at: string; created_by: string | null; notes: string | null }
type ProfileRecord = { user_id: string; name: string; email: string | null }

export function useAdminsData() {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data, error: fetchError } = await supabase
      .from("platform_admins")
      .select("user_id, created_at, created_by, notes")
      .order("created_at", { ascending: true })

    if (fetchError) {
      showError("Failed to load platform admins")
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setAdmins([])
      setLoading(false)
      return
    }

    const userIds = (data as AdminRecord[]).map((row: AdminRecord) => row.user_id)
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, name, email")
      .in("user_id", userIds)

    const profileMap = new Map(
      ((profiles ?? []) as ProfileRecord[]).map((p: ProfileRecord) => [p.user_id, p])
    )

    const enriched: AdminRow[] = (data as AdminRecord[]).map((row: AdminRecord) => ({
      ...row,
      profile: profileMap.get(row.user_id) ?? null,
    }))

    setAdmins(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  return { admins, loading, error, refetch: fetchAdmins }
}
