"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getNowISO } from "@/lib/date-helpers"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import {
  PersonFormData,
  EmergencyContact,
  Gender,
} from "@/types/people.types"
import { validatePhone as validateIndianMobile } from "@/lib/phone"
import { validateAadhaar, validatePAN } from "@/lib/validators"
import { IdDocumentData, DEFAULT_ID_DOCUMENT } from "@/components/forms"
import { logger } from "@/lib/logger"

export function usePeopleEditForm() {
  const params = useParams()
  const router = useRouter()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/people", defaultLabel: "All People" })
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PersonFormData>({
    name: "",
    phone: "",
    email: "",
    tags: [],
    emergency_contacts: [],
  })
  const [originalPhone, setOriginalPhone] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [idDocuments, setIdDocuments] = useState<IdDocumentData[]>([{ ...DEFAULT_ID_DOCUMENT }])

  useEffect(() => {
    const fetchPerson = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error || !data) {
        logger.error("Error fetching person:", { detail: error })
        showError("Person not found")
        router.push("/people")
        return
      }

      setFormData({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        photo_url: data.photo_url || "",
        date_of_birth: data.date_of_birth || "",
        gender: data.gender || undefined,
        aadhaar_number: data.aadhaar_number || "",
        pan_number: data.pan_number || "",
        permanent_address: data.permanent_address || "",
        permanent_city: data.permanent_city || "",
        permanent_state: data.permanent_state || "",
        permanent_pincode: data.permanent_pincode || "",
        current_address: data.current_address || "",
        current_city: data.current_city || "",
        occupation: data.occupation || "",
        company_name: data.company_name || "",
        designation: data.designation || "",
        blood_group: data.blood_group || "",
        emergency_contacts: data.emergency_contacts || [],
        tags: data.tags || [],
        notes: data.notes || "",
      })
      setOriginalPhone(data.phone)

      if (data.id_documents && Array.isArray(data.id_documents) && data.id_documents.length > 0) {
        const loadedDocs: IdDocumentData[] = data.id_documents.map((doc: { type: string; number: string; file_url?: string }) => {
          const typeMap: Record<string, string> = {
            aadhaar_card: "Aadhaar Card",
            pan_card: "PAN Card",
            passport: "Passport",
            driving_license: "Driving License",
            voter_id: "Voter ID",
            other: "Other",
          }
          return {
            type: typeMap[doc.type] || doc.type || "Aadhaar Card",
            number: doc.number || "",
            file_urls: doc.file_url ? [doc.file_url] : [],
          }
        })
        setIdDocuments(loadedDocs)
      } else if (data.aadhaar_number || data.pan_number) {
        const docs: IdDocumentData[] = []
        if (data.aadhaar_number) {
          docs.push({ type: "Aadhaar Card", number: data.aadhaar_number, file_urls: [] })
        }
        if (data.pan_number) {
          docs.push({ type: "PAN Card", number: data.pan_number, file_urls: [] })
        }
        setIdDocuments(docs.length > 0 ? docs : [{ ...DEFAULT_ID_DOCUMENT }])
      }
      setPageLoading(false)
    }

    fetchPerson()
  }, [params.id, router])

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
      file_urls: updated[docIndex].file_urls.filter((_, i) => i !== fileIndex)
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
    const supabase = createClient()

    if (formData.phone && formData.phone !== originalPhone) {
      const { data: existing } = await supabase
        .from("people")
        .select("id, name")
        .eq("phone", formData.phone)
        .neq("id", params.id)
        .single()

      if (existing) {
        showError(`A person with this phone already exists: ${existing.name}`)
        setLoading(false)
        return
      }
    }

    const aadhaarDoc = idDocuments.find(d => d.type === "Aadhaar Card" && d.number.trim())
    const panDoc = idDocuments.find(d => d.type === "PAN Card" && d.number.trim())

    const validIdDocuments = idDocuments
      .filter(d => d.number.trim() || d.file_urls.length > 0)
      .map(d => ({
        type: d.type.toLowerCase().replace(/ /g, "_"),
        number: d.number,
        file_url: d.file_urls[0] || null,
        verified: false,
      }))

    const { error } = await supabase
      .from("people")
      .update({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        photo_url: formData.photo_url || null,
        date_of_birth: formData.date_of_birth || null,
        gender: (formData.gender as Gender) || null,
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
        notes: formData.notes || null,
        updated_at: getNowISO(),
      })
      .eq("id", params.id)

    if (error) {
      logger.error("Error updating person:", { detail: error })
      showError("Failed to update person")
      setLoading(false)
      return
    }

    showSuccess("Person updated successfully")
    router.push(`/people/${params.id}`)
  }

  return {
    params,
    pageLoading,
    loading,
    formData,
    errors,
    idDocuments,
    backHref,
    backLabel,
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
