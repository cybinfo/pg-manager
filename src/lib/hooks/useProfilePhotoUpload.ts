"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"
import { compressImage } from "@/lib/image-utils"

interface UseProfilePhotoUploadOptions {
  bucket: string
  folder?: string
  onChange?: (url: string) => void
}

interface UseProfilePhotoUploadReturn {
  uploading: boolean
  selectedImage: string | null
  cropperOpen: boolean
  handleFileSelect: (files: FileList | null) => void
  handleCropComplete: (croppedBlob: Blob) => Promise<void>
  handleCropperClose: () => void
}

export function useProfilePhotoUpload({
  bucket,
  folder = "",
  onChange,
}: UseProfilePhotoUploadOptions): UseProfilePhotoUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.size > 10 * 1024 * 1024) {
      showError("File too large. Maximum size is 10MB")
      return
    }

    const imageUrl = URL.createObjectURL(file)
    setSelectedImage(imageUrl)
    setCropperOpen(true)
  }, [])

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setUploading(true)

      try {
        const supabase = createClient()
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 8)
        const filename = `${timestamp}-${randomId}.jpg`

        // C6 principle: compress profile photo to max 200KB, 800px
        const rawFile = new File([croppedBlob], filename, { type: "image/jpeg" })
        const compressed = await compressImage(rawFile, 200, 800)

        const path = folder ? `${folder}/${filename}` : filename

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, compressed, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          })

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path)

        if (urlData?.publicUrl) {
          onChange?.(urlData.publicUrl)
          showSuccess("Photo uploaded")
        }
      } catch (err) {
        logger.error("Upload error:", { error: String(err) })
        showError("Failed to upload photo")
      } finally {
        setUploading(false)
        setSelectedImage((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
      }
    },
    [bucket, folder, onChange]
  )

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false)
    setSelectedImage((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  return {
    uploading,
    selectedImage,
    cropperOpen,
    handleFileSelect,
    handleCropComplete,
    handleCropperClose,
  }
}
