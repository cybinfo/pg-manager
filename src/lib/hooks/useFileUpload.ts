"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { logger } from "@/lib/logger"
import { compressImage } from "@/lib/image-utils"

interface UseFileUploadOptions {
  bucket: string
  folder?: string
  maxSize?: number
  multiple?: boolean
  files: string[]
  onChange?: (urls: string | string[]) => void
  onRemove?: (url: string) => void
}

interface UseFileUploadReturn {
  uploading: boolean
  handleFileSelect: (selectedFiles: FileList | null) => Promise<void>
  handleRemove: (urlToRemove: string) => Promise<void>
}

export function useFileUpload({
  bucket,
  folder = "",
  maxSize = 5,
  multiple = false,
  files,
  onChange,
  onRemove,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const filesToUpload = Array.from(selectedFiles)

      const oversizedFiles = filesToUpload.filter(
        (file) => file.size > maxSize * 1024 * 1024
      )
      if (oversizedFiles.length > 0) {
        showError(`File(s) too large. Maximum size is ${maxSize}MB`)
        return
      }

      setUploading(true)

      try {
        const supabase = createClient()
        const uploadedUrls: string[] = []

        for (const rawFile of filesToUpload) {
          // C6 principle: compress images before upload (max 500KB, 1200px)
          const file = await compressImage(rawFile, 500, 1200)

          const timestamp = Date.now()
          const randomId = Math.random().toString(36).substring(2, 8)
          const ext = file.name.split(".").pop()
          const filename = `${timestamp}-${randomId}.${ext}`
          const path = folder ? `${folder}/${filename}` : filename

          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            })

          if (error) {
            logger.error("Upload error:", { detail: error })
            showError(`Failed to upload ${file.name}`)
            continue
          }

          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path)

          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl)
          }
        }

        if (uploadedUrls.length > 0) {
          if (multiple) {
            onChange?.([...files, ...uploadedUrls])
          } else {
            onChange?.(uploadedUrls[0])
          }
          showSuccess(
            uploadedUrls.length === 1
              ? "File uploaded successfully"
              : `${uploadedUrls.length} files uploaded`
          )
        }
      } catch (err) {
        logger.error("Upload error:", { error: String(err) })
        showError("Failed to upload file(s)")
      } finally {
        setUploading(false)
      }
    },
    [bucket, folder, maxSize, multiple, files, onChange]
  )

  const handleRemove = useCallback(
    async (urlToRemove: string) => {
      try {
        const url = new URL(urlToRemove)
        const path = url.pathname.split(`/storage/v1/object/public/${bucket}/`)[1]

        if (path) {
          const supabase = createClient()
          await supabase.storage.from(bucket).remove([path])
        }

        if (multiple) {
          onChange?.(files.filter((f) => f !== urlToRemove))
        } else {
          onChange?.("")
        }
        onRemove?.(urlToRemove)
        showSuccess("File removed")
      } catch (err) {
        logger.error("Remove error:", { error: String(err) })
        showError("Failed to remove file")
      }
    },
    [bucket, multiple, files, onChange, onRemove]
  )

  return { uploading, handleFileSelect, handleRemove }
}
