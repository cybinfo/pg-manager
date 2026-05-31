"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import { validatePhone as validateIndianMobile } from "@/lib/phone"
import { validateAadhaar, validatePAN } from "@/lib/validators"
import { IdDocumentData, DEFAULT_ID_DOCUMENT } from "@/components/forms"
import type { PersonFormData, EmergencyContact, Gender } from "@/types/people.types"

export type { Gender }

export function usePeopleCreateForm() {
  const router = useRouter()
  const { user } = useAuth()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/people", defaultLabel: "All People" })

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PersonFormData>({
    name: "",
    phone: "",
    email: "",
    photo_url: "",
    tags: [],
    emergency_contacts: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [idDocuments, setIdDocuments] = useState<IdDocumentData[]>([{ ...DEFAULT_ID_DOCUMENT }])

  const updateField = (field: keyof PersonFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: [
        ...(prev.emergency_contacts || []),
        { name: "", phone: "", relation: "" },
      ],
    }))
  }

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setFormData((prev) => {
      const contacts = [...(prev.emergency_contacts || [])]
      contacts[index] = { ...contacts[index], [field]: value }
      return { ...prev, emergency_contacts: contacts }
    })
  }

  const removeEmergencyContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: (prev.emergency_contacts || []).filter((_, i) => i !== index),
    }))
  }

  const updateIdDocument = (index: number, field: keyof IdDocumentData, value: string | string[]) => {
    const updated = [...idDocuments]
    updated[index] = { ...updated[index], [field]: value }
    setIdDocuments(updated)
  }

  const addIdDocument = () => {
    setIdDocuments([...idDocuments, { ...DEFAULT_ID_DOCUMENT, type: "PAN Card" }])
  }

  const removeIdDocument = (index: number) => {
    if (idDocuments.length > 1) {
      setIdDocuments(idDocuments.filter((_, i) => i !== index))
    }
  }

  const removeDocumentFile = (docIndex: number, fileIndex: number) => {
    const updated = [...idDocuments]
    updated[docIndex] = {
      ...updated[docIndex],
      file_urls: updated[docIndex].file_urls.filter((_, i) => i !== fileIndex),
    }
    setIdDocuments(updated)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required"
    }

    if (formData.phone && !validateIndianMobile(formData.phone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number"
    }

    idDocuments.forEach((doc, index) => {
      if (doc.number.trim()) {
        if (doc.type === "Aadhaar Card" && !validateAadhaar(doc.number)) {
          newErrors[`id_doc_${index}`] = "Enter a valid 12-digit Aadhaar number"
        }
        if (doc.type === "PAN Card" && !validatePAN(doc.number)) {
          newErrors[`id_doc_${index}`] = "Enter a valid PAN (e.g., ABCDE1234F)"
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      showError("Please fix the errors before submitting")
      return
    }

    setLoading(true)

    if (!user) {
      showError("You must be logged in to add a person")
      setLoading(false)
      return
    }

    const supabase = createClient()

    if (formData.phone) {
      const { data: existing } = await supabase
        .from("people")
        .select("id, name")
        .eq("phone", formData.phone)
        .single()

      if (existing) {
        showError(`A person with this phone already exists: ${existing.name}`)
        setLoading(false)
        return
      }
    }

    const aadhaarDoc = idDocuments.find((d) => d.type === "Aadhaar Card" && d.number.trim())
    const panDoc = idDocuments.find((d) => d.type === "PAN Card" && d.number.trim())

    const validIdDocuments = idDocuments
      .filter((d) => d.number.trim() || d.file_urls.length > 0)
      .map((d) => ({
        type: d.type.toLowerCase().replace(/ /g, "_"),
        number: d.number,
        file_url: d.file_urls[0] || null,
        verified: false,
      }))

    const { data, error } = await supabase
      .from("people")
      .insert(
        withCreatedBy(
          {
            owner_id: user.id,
            name: formData.name,
            phone: formData.phone || null,
            email: formData.email || null,
            photo_url: formData.photo_url || null,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender || null,
            aadhaar_number: aadhaarDoc?.number || null,
            pan_number: panDoc?.number || null,
            id_documents: validIdDocuments.length > 0 ? validIdDocuments : [],
            permanent_address: formData.permanent_address || null,
            permanent_city: formData.permanent_city || null,
            permanent_state: formData.permanent_state || null,
            permanent_pincode: formData.permanent_pincode || null,
            current_address: formData.current_address || null,
            current_city: formData.current_city || null,
            occupation: formData.occupation || null,
            company_name: formData.company_name || null,
            designation: formData.designation || null,
            blood_group: formData.blood_group || null,
            emergency_contacts: formData.emergency_contacts || [],
            tags: formData.tags || [],
            notes: formData.notes || null,
            source: "manual",
          },
          user.id
        )
      )
      .select()
      .single()

    if (error) {
      logger.error("Error creating person:", { detail: error })
      showError("Failed to create person")
      setLoading(false)
      return
    }

    showSuccess("Person added successfully")
    router.push(`/people/${data.id}`)
  }

  return {
    backHref,
    backLabel,
    loading,
    formData,
    errors,
    idDocuments,
    updateField,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    updateIdDocument,
    addIdDocument,
    removeIdDocument,
    removeDocumentFile,
    handleSubmit,
  }
}
