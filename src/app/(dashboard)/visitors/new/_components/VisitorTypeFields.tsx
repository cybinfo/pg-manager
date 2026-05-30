"use client"

import { PersonSearchResult } from "@/types/people.types"
import { VisitorType, EnquirySource } from "@/types/visitors.types"
import { TenantVisitorFields } from "./TenantVisitorFields"
import { ServiceProviderFields } from "./ServiceProviderFields"
import { EnquiryFields } from "./EnquiryFields"
import { GeneralVisitorFields } from "./GeneralVisitorFields"

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
    expected_move_in: string
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
      <TenantVisitorFields
        formData={{ tenant_id: formData.tenant_id, relation: formData.relation }}
        onChange={onChange}
        filteredTenants={filteredTenants}
        loading={loading}
      />
    )
  }

  if (visitorType === "service_provider") {
    return (
      <ServiceProviderFields
        formData={{ service_type: formData.service_type, company_name: formData.company_name }}
        onChange={onChange}
        selectedPerson={selectedPerson}
        loading={loading}
      />
    )
  }

  if (visitorType === "enquiry") {
    return (
      <EnquiryFields
        formData={{
          enquiry_source: formData.enquiry_source,
          follow_up_date: formData.follow_up_date,
          rooms_interested: formData.rooms_interested,
          expected_move_in: formData.expected_move_in,
        }}
        onChange={onChange}
        onRoomsInterestedChange={onRoomsInterestedChange}
        filteredRooms={filteredRooms}
        loading={loading}
      />
    )
  }

  if (visitorType === "general") {
    return (
      <GeneralVisitorFields
        formData={{ host_name: formData.host_name, department: formData.department }}
        onChange={onChange}
        loading={loading}
      />
    )
  }

  return null
}
