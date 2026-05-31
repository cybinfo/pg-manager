"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

export interface BusinessOption {
  value: string
  label: string
}

export function useBusinessOptions() {
  const { user } = useAuth()
  const [options, setOptions] = useState<BusinessOption[]>([])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from("businesses")
      .select("id, name, legal_name")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("name")
      .then(({ data }: { data: Array<{ id: string; name: string; legal_name: string | null }> | null }) => {
        if (data) {
          setOptions(
            data.map((b: { id: string; name: string; legal_name: string | null }) => ({
              value: b.id,
              label: b.legal_name ? `${b.name} (${b.legal_name})` : b.name,
            }))
          )
        }
      })
  }, [user])

  return options
}
