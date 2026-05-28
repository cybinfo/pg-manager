"use client"

import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PROPERTY_TYPE_OPTIONS } from "@/lib/constants/form-options"
import type { WebsiteConfig, OnWebsiteChange } from "./WebsiteTypes"

interface Props {
  config: WebsiteConfig
  onWebsiteChange: OnWebsiteChange
}

export function WebsiteBasicInfoSection({ config, onWebsiteChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Property Type">
            <Select
              value={config.property_type}
              onChange={(e) => onWebsiteChange("property_type", e.target.value)}
              options={PROPERTY_TYPE_OPTIONS}
            />
          </FormField>
          <FormField label="Established Year">
            <Input
              type="number"
              placeholder="e.g., 2020"
              value={config.established_year}
              onChange={(e) => onWebsiteChange("established_year", e.target.value)}
              min="1990"
              max={new Date().getFullYear()}
            />
          </FormField>
        </div>

        <FormField label="Tagline">
          <Input
            placeholder="e.g., Your Home Away From Home"
            value={config.tagline}
            onChange={(e) => onWebsiteChange("tagline", e.target.value)}
            maxLength={100}
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            className="min-h-[120px] resize-none"
            placeholder="Tell potential tenants about your PG - facilities, environment, what makes it special..."
            value={config.description}
            onChange={(e) => onWebsiteChange("description", e.target.value)}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {config.description.length}/1000
          </p>
        </FormField>
      </CardContent>
    </Card>
  )
}
