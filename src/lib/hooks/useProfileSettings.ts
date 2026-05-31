"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { Owner } from "@/types/settings.types"

interface UseProfileSettingsOptions {
  owner: Owner | null
  setOwner: (owner: Owner) => void
}

export function useProfileSettings({ owner, setOwner }: UseProfileSettingsOptions) {
  const [saving, setSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: owner?.name || "",
    phone: owner?.phone || "",
    business_name: owner?.business_name || "",
  })

  const saveProfile = async () => {
    if (!owner) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("owners")
        .update({
          name: profileForm.name,
          phone: profileForm.phone || null,
          business_name: profileForm.business_name || null,
        })
        .eq("id", owner.id)

      if (error) throw error

      setOwner({ ...owner, ...profileForm })
      showSuccess("Profile updated successfully")
    } catch (_error) {
      showError("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    profileForm,
    setProfileForm,
    saveProfile,
  }
}
