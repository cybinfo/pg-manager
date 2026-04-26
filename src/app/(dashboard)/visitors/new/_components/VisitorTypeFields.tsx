"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Wrench, Briefcase, Search, Calendar, User } from "lucide-react"
import { PersonSearchResult } from "@/types/people.types"
import {
  VisitorType,
  EnquirySource,
  SERVICE_TYPES,
  VISITOR_RELATIONS,
  ENQUIRY_SOURCE_LABELS,
} from "@/types/visitors.types"
import { getTodayISO } from "@/lib/date-helpers"

interface Tenant {
  id: string
  name: string
  phone: string
  property_id: string
  room: {
    room_number: string
  } | null
}

interface Room {
  id: string
  room_number: string
  property_id: string
}

interface VisitorTypeFieldsProps {
  visitorType: VisitorType
  formData: {
    tenant_id: string
    relation: string
    service_type: string
    company_name: string
    enquiry_source: EnquirySource | ""
    follow_up_date: string
    rooms_interested: string[]
    host_name: string
    department: string
  }
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onRoomsInterestedChange: (roomId: string) => void
  filteredTenants: Tenant[]
  filteredRooms: Room[]
  selectedPerson: PersonSearchResult | null
  loading: boolean
}

export function VisitorTypeFields({
  visitorType,
  formData,
  onChange,
  onRoomsInterestedChange,
  filteredTenants,
  filteredRooms,
  selectedPerson,
  loading,
}: VisitorTypeFieldsProps) {
  if (visitorType === "tenant_visitor") {
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
          <div className="space-y-2">
            <Label htmlFor="tenant_id">Tenant *</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="relation">Relation</Label>
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
          </div>
        </CardContent>
      </Card>
    )
  }

  if (visitorType === "service_provider") {
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
          {/* Show service info from person if available */}
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

  if (visitorType === "enquiry") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Enquiry Details</CardTitle>
              <CardDescription>Information about the prospective tenant</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enquiry_source">How did they find you?</Label>
              <Select
                id="enquiry_source"
                name="enquiry_source"
                value={formData.enquiry_source}
                onChange={onChange}
                disabled={loading}
                placeholder="Select source"
                options={(Object.keys(ENQUIRY_SOURCE_LABELS) as EnquirySource[]).map((source) => ({
                  value: source,
                  label: ENQUIRY_SOURCE_LABELS[source],
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">
                <Calendar className="h-4 w-4 inline mr-1" />
                Follow-up Date
              </Label>
              <Input
                id="follow_up_date"
                name="follow_up_date"
                type="date"
                value={formData.follow_up_date}
                onChange={onChange}
                disabled={loading}
                min={getTodayISO()}
              />
            </div>
          </div>

          {filteredRooms.length > 0 && (
            <div className="space-y-2">
              <Label>Rooms Interested In</Label>
              <div className="flex flex-wrap gap-2">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onRoomsInterestedChange(room.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      formData.rooms_interested.includes(room.id)
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                        : "bg-muted text-foreground border-border hover:border-border"
                    }`}
                  >
                    Room {room.room_number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (visitorType === "general") {
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
            <div className="space-y-2">
              <Label htmlFor="host_name">Meeting With (Host Name)</Label>
              <Input
                id="host_name"
                name="host_name"
                placeholder="e.g., Manager's name"
                value={formData.host_name}
                onChange={onChange}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                placeholder="e.g., Administration"
                value={formData.department}
                onChange={onChange}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
