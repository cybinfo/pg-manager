"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, ClipboardCheck } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { APPROVAL_TYPE_LABELS } from "@/lib/status"
import { useApprovalSettings } from "@/lib/hooks/useApprovalSettings"

const AUTO_APPROVABLE_TYPES = Object.entries(APPROVAL_TYPE_LABELS).filter(([key]) =>
  ["name_change", "address_change", "phone_change", "email_change", "lease_renewal"].includes(key)
)

interface ApprovalSettingsProps {
  workspaceId?: string
}

export function ApprovalSettings({ workspaceId: propWorkspaceId }: ApprovalSettingsProps) {
  const { workspaceId, autoTypes, setAutoTypes, loading } = useApprovalSettings({ workspaceId: propWorkspaceId })
  const [saving, setSaving] = useState(false)

  const toggleType = (type: string) => {
    setAutoTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const save = async () => {
    if (!workspaceId) return
    setSaving(true)
    const supabase = createClient()

    const { data: current } = await supabase
      .from("workspaces")
      .select("module_config")
      .eq("id", workspaceId)
      .single()

    const existingConfig = (current?.module_config || {}) as Record<string, unknown>
    const existingApprovals = (existingConfig.approvals || {}) as Record<string, unknown>

    const { error } = await supabase
      .from("workspaces")
      .update({
        module_config: {
          ...existingConfig,
          approvals: {
            ...existingApprovals,
            auto_approval_types: autoTypes,
          },
        },
      })
      .eq("id", workspaceId)

    if (error) {
      showError("Failed to save auto-approval settings")
    } else {
      showSuccess("Auto-approval rules saved")
    }
    setSaving(false)
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Auto-Approval Rules</CardTitle>
            <CardDescription>
              Tenant requests of the selected types will be automatically approved without manual review
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {AUTO_APPROVABLE_TYPES.map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={autoTypes.includes(key)}
                onChange={() => toggleType(key)}
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">Automatically approve {label.toLowerCase()} requests</p>
              </div>
            </label>
          ))}
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Auto-Approval Rules
        </Button>
      </CardContent>
    </Card>
  )
}
