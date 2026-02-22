"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DetailSection, InfoRow, DetailListSection } from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Briefcase,
  Heart,
  Users,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import type { Tenant } from "@/types/tenants.types"

interface PersonalInfoSectionProps {
  tenant: Tenant
}

export function PersonalInfoSection({ tenant }: PersonalInfoSectionProps) {
  return (
    <>
      {/* Personal Information (from People module - read only) */}
      <DetailSection
        title="Personal Information"
        description="From People module"
        icon={User}
        actions={
          tenant.person_id && (
            <Link href={`/people/${tenant.person_id}/edit`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Edit in People
              </Button>
            </Link>
          )
        }
      >
        <InfoRow
          label="Phone"
          value={
            <a href={`tel:${tenant.person?.phone || tenant.phone}`} className="text-primary hover:underline">
              {tenant.person?.phone || tenant.phone}
            </a>
          }
          icon={Phone}
        />
        {(tenant.person?.email || tenant.email) && (
          <InfoRow
            label="Email"
            value={
              <a href={`mailto:${tenant.person?.email || tenant.email}`} className="text-primary hover:underline">
                {tenant.person?.email || tenant.email}
              </a>
            }
            icon={Mail}
          />
        )}
        {tenant.person?.date_of_birth && (
          <InfoRow label="Date of Birth" value={formatDate(tenant.person.date_of_birth)} icon={Calendar} />
        )}
        {tenant.person?.gender && (
          <InfoRow label="Gender" value={tenant.person.gender} />
        )}
        {(tenant.person?.occupation || tenant.person?.company_name) && (
          <InfoRow
            label="Occupation"
            value={[tenant.person?.occupation, tenant.person?.company_name].filter(Boolean).join(" at ")}
            icon={Briefcase}
          />
        )}
        {tenant.person?.blood_group && (
          <InfoRow label="Blood Group" value={tenant.person.blood_group} icon={Heart} />
        )}
        {tenant.person?.permanent_address && (
          <InfoRow
            label="Permanent Address"
            value={[
              tenant.person.permanent_address,
              tenant.person.permanent_city,
              tenant.person.permanent_state,
              tenant.person.permanent_pincode
            ].filter(Boolean).join(", ")}
            icon={MapPin}
          />
        )}
        {tenant.person?.aadhaar_number && (
          <InfoRow label="Aadhaar" value={`XXXX-XXXX-${tenant.person.aadhaar_number.slice(-4)}`} icon={Shield} />
        )}
        {tenant.person?.pan_number && (
          <InfoRow label="PAN" value={tenant.person.pan_number} icon={FileText} />
        )}
        {tenant.person?.is_verified && (
          <InfoRow
            label="Verification"
            value={
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="h-4 w-4" /> Verified
              </span>
            }
          />
        )}
      </DetailSection>

      {/* Emergency Contacts (from People) */}
      {tenant.person?.emergency_contacts && tenant.person.emergency_contacts.length > 0 && (
        <DetailListSection
          title="Emergency Contacts"
          description="From People module"
          icon={Users}
          items={tenant.person.emergency_contacts}
          keyExtractor={(contact, idx) => `emergency-${idx}-${contact.phone}`}
          renderItem={(contact) => (
            <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.relation}</p>
              </div>
              <a href={`tel:${contact.phone}`} className="text-primary hover:underline text-sm">
                {contact.phone}
              </a>
            </div>
          )}
          initialLimit={3}
          viewAllMode="expand"
          emptyText="No emergency contacts"
          actions={
            tenant.person_id && (
              <Link href={`/people/${tenant.person_id}/edit`}>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )
          }
        />
      )}

      {/* Guardian Contacts (tenant-specific, legacy) */}
      {tenant.guardian_contacts && tenant.guardian_contacts.length > 0 && (
        <DetailListSection
          title="Guardian Contacts"
          description="Tenant-specific contacts"
          icon={Users}
          items={tenant.guardian_contacts}
          keyExtractor={(guardian, idx) => `guardian-${idx}-${guardian.phone}`}
          renderItem={(guardian) => (
            <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
              <div>
                <p className="font-medium">{guardian.name}</p>
                <p className="text-xs text-muted-foreground">{guardian.relation}</p>
              </div>
              <a href={`tel:${guardian.phone}`} className="text-primary hover:underline text-sm">
                {guardian.phone}
              </a>
            </div>
          )}
          initialLimit={3}
          viewAllMode="expand"
          emptyText="No guardian contacts"
        />
      )}

      {/* Tenancy Verification Status */}
      <DetailSection title="Verification Status" description="Tenancy verification" icon={Shield}>
        <InfoRow
          label="Police Verification"
          value={<StatusBadge status={tenant.police_verification_status === "verified" ? "verified" : tenant.police_verification_status === "submitted" ? "pending" : "unverified"} size="sm" />}
          icon={Shield}
        />
        <InfoRow
          label="Agreement"
          value={
            tenant.agreement_signed ? (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="h-4 w-4" /> Signed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-warning">
                <AlertCircle className="h-4 w-4" /> Pending
              </span>
            )
          }
          icon={FileText}
        />
      </DetailSection>
    </>
  )
}
