"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { EmailVerificationCard } from "@/components/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { Owner } from "@/types/settings.types"

interface ProfileSettingsProps {
  owner: Owner | null
  setOwner: (owner: Owner) => void
  userId: string | undefined
  profile: {
    name?: string | null
    email_verified?: boolean
    email_verified_at?: string | null
  } | null
}

export function ProfileSettings({ owner, setOwner, userId, profile }: ProfileSettingsProps) {
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

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>Your business information displayed on receipts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Business Name" htmlFor="business_name" hint="This will appear on receipts and notices">
            <Input
              id="business_name"
              placeholder="e.g., Sunrise PG Accommodations"
              value={profileForm.business_name}
              onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
            />
          </FormField>

          <FormField label="Your Name" htmlFor="name">
            <Input
              id="name"
              placeholder="Your full name"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />
          </FormField>

          <FormField label="Email" htmlFor="email" hint="Email cannot be changed">
            <Input
              id="email"
              type="email"
              value={owner?.email || ""}
              disabled
              className="bg-muted"
            />
          </FormField>

          <FormField label="Phone Number" htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </FormField>

          <Button onClick={saveProfile} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Email Verification */}
      {userId && owner?.email && (
        <EmailVerificationCard
          userId={userId}
          email={owner.email}
          userName={owner.name || profile?.name || "User"}
          emailVerified={profile?.email_verified || false}
          emailVerifiedAt={profile?.email_verified_at}
        />
      )}
    </div>
  )
}
