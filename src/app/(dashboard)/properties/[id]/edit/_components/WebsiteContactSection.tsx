"use client"

import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  contactWhatsapp: string
  contactEmail: string
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteContactSection({ contactWhatsapp, contactEmail, onWebsiteChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="WhatsApp Number">
            <Input
              type="tel"
              placeholder="e.g., 9876543210"
              value={contactWhatsapp}
              onChange={(e) => onWebsiteChange("contact_whatsapp", e.target.value)}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              placeholder="contact@yourpg.com"
              value={contactEmail}
              onChange={(e) => onWebsiteChange("contact_email", e.target.value)}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}
