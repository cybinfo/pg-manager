"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench, Briefcase } from "lucide-react"
import { Select } from "@/components/ui/form-components"
import { PersonSearchResult } from "@/types/people.types"
import { SERVICE_TYPES } from "@/types/visitors.types"

interface ServiceProviderFieldsProps {
  formData: { service_type: string; company_name: string }
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  selectedPerson: PersonSearchResult | null
  loading: boolean
}

export function ServiceProviderFields({ formData, onChange, selectedPerson, loading }: ServiceProviderFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <Wrench className="h-5 w-5 text-warning" />
          </div>
          <div>
            <CardTitle>Service Details</CardTitle>
            <CardDescription>
              Service info from People module (or enter manually if needed)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedPerson && (selectedPerson.occupation || selectedPerson.company_name) && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="text-sm text-warning">
              <strong>From People:</strong>{" "}
              {selectedPerson.occupation && <span>{selectedPerson.occupation}</span>}
              {selectedPerson.company_name && <span> at {selectedPerson.company_name}</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service_type">
              Service Type {!selectedPerson?.occupation && "*"}
            </Label>
            <Select
              id="service_type"
              name="service_type"
              value={formData.service_type}
              onChange={onChange}
              disabled={loading || !!selectedPerson?.occupation}
              placeholder={selectedPerson?.occupation || "Select service type"}
              options={!selectedPerson?.occupation ? SERVICE_TYPES.map((type) => ({
                value: type,
                label: type,
              })) : []}
            />
            {selectedPerson?.occupation && (
              <p className="text-xs text-muted-foreground">
                Using occupation from People module
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">
              <Briefcase className="h-4 w-4 inline mr-1" />
              Company Name
            </Label>
            <Input
              id="company_name"
              name="company_name"
              placeholder={selectedPerson?.company_name || "e.g., XYZ Services"}
              value={selectedPerson?.company_name || formData.company_name}
              onChange={onChange}
              disabled={loading || !!selectedPerson?.company_name}
            />
            {selectedPerson?.company_name && (
              <p className="text-xs text-muted-foreground">
                Using company from People module
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
