"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"
import { FormField } from "@/components/ui/form-components"

interface GeneralVisitorFieldsProps {
  formData: { host_name: string; department: string }
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  loading: boolean
}

export function GeneralVisitorFields({ formData, onChange, loading }: GeneralVisitorFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <User className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <CardTitle>Visit Details</CardTitle>
            <CardDescription>Additional information about the visit</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Meeting With (Host Name)" htmlFor="host_name">
            <Input
              id="host_name"
              name="host_name"
              placeholder="e.g., Manager's name"
              value={formData.host_name}
              onChange={onChange}
              disabled={loading}
            />
          </FormField>
          <FormField label="Department" htmlFor="department">
            <Input
              id="department"
              name="department"
              placeholder="e.g., Administration"
              value={formData.department}
              onChange={onChange}
              disabled={loading}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}
