"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-components"
import { UserPlus } from "lucide-react"
import { PersonSearchResult } from "@/types/people.types"

interface VisitDetailsCardProps {
  vehicleNumber: string
  purpose: string
  selectedPerson: PersonSearchResult | null
  loading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}

export function VisitDetailsCard({
  vehicleNumber,
  purpose,
  selectedPerson,
  loading,
  onChange,
}: VisitDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Visit Details</CardTitle>
            <CardDescription>
              Information about this visit (personal details are managed in People module)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Vehicle Number" htmlFor="vehicle_number">
          <Input
            id="vehicle_number"
            name="vehicle_number"
            placeholder="e.g., MH12AB1234"
            value={vehicleNumber}
            onChange={onChange}
            disabled={loading}
          />
        </FormField>

        <FormField label="Purpose of Visit" htmlFor="purpose">
          <textarea
            id="purpose"
            name="purpose"
            placeholder="e.g., Meeting, Delivery, etc."
            value={purpose}
            onChange={onChange}
            disabled={loading}
            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </FormField>

        {/* Note about ID documents */}
        {selectedPerson && !selectedPerson.id_documents?.length && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
            <strong>Note:</strong> This visitor has no ID documents on file.
            ID information is managed in the People module.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
