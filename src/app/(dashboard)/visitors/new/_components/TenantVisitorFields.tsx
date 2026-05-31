"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { FormField, Select } from "@/components/ui/form-components"
import { VISITOR_RELATIONS } from "@/types/visitors.types"

interface Tenant {
  id: string
  name: string
  phone: string
  entity_id: string
  room: { room_number: string } | null
}

interface TenantVisitorFieldsProps {
  formData: { tenant_id: string; relation: string }
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  filteredTenants: Tenant[]
  loading: boolean
}

export function TenantVisitorFields({ formData, onChange, filteredTenants, loading }: TenantVisitorFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info/10 rounded-lg">
            <Users className="h-5 w-5 text-info" />
          </div>
          <div>
            <CardTitle>Visiting Tenant</CardTitle>
            <CardDescription>Who is this visitor here to see?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Tenant" htmlFor="tenant_id" required>
          <Select
            id="tenant_id"
            name="tenant_id"
            value={formData.tenant_id}
            onChange={onChange}
            required
            disabled={loading || filteredTenants.length === 0}
            placeholder={filteredTenants.length === 0 ? "No tenants in this property" : undefined}
            options={filteredTenants.map((tenant) => ({
              value: tenant.id,
              label: `${tenant.name} (Room ${tenant.room?.room_number})`,
            }))}
          />
        </FormField>

        <FormField label="Relation" htmlFor="relation">
          <Select
            id="relation"
            name="relation"
            value={formData.relation}
            onChange={onChange}
            disabled={loading}
            placeholder="Select relation"
            options={VISITOR_RELATIONS.map((rel) => ({
              value: rel,
              label: rel,
            }))}
          />
        </FormField>
      </CardContent>
    </Card>
  )
}
