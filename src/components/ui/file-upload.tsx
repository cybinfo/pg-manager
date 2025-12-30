"use client"

import { useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "./button"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  bucket: string // Supabase storage bucket name
  folder?: string // Optional folder path within bucket
  accept?: string // Accepted file types (e.g., "image/*", ".pdf,.jpg")
  maxSize?: number // Max file size in MB (default 5MB)
  multiple?: boolean // Allow multiple files
  value?: string | string[] // Current file URL(s)
  onChange?: (urls: string | string[]) => void
  onRemove?: (url: string) => void
  label?: string
  description?: string
  className?: string
  showPreview?: boolean // Show image preview
  disabled?: boolean
}

export function FileUpload({
  bucket,
  folder = "",
  accept = "image/*",
  maxSize = 5,
  multiple = false,
  value,
  onChange,
  onRemove,
  label,
  description,
  className,
  showPreview = true,
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Normalize value to array for internal use
  const files = Array.isArray(value) ? value : value ? [value] : []

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const filesToUpload = Array.from(selectedFiles)

      // Validate file sizes
      const oversizedFiles = filesToUpload.filter(
        (file) => file.size > maxSize * 1024 * 1024
      )
      if (oversizedFiles.length > 0) {
        toast.error(`File(s) too large. Maximum size is ${maxSize}MB`)
        return
      }

      setUploading(true)

      try {
        const supabase = createClient()
        const uploadedUrls: string[] = []

        for (const file of filesToUpload) {
          // Generate unique filename
          const timestamp = Date.now()
          const randomId = Math.random().toString(36).substring(2, 8)
          const ext = file.name.split(".").pop()
          const filename = `${timestamp}-${randomId}.${ext}`
          const path = folder ? `${folder}/${filename}` : filename

          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            })

          if (error) {
            console.error("Upload error:", error)
            toast.error(`Failed to upload ${file.name}`)
            continue
          }

          // Get public URL
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
          toast.success(
            uploadedUrls.length === 1
              ? "File uploaded successfully"
              : `${uploadedUrls.length} files uploaded`
          )
        }
      } catch (error) {
        console.error("Upload error:", error)
        toast.error("Failed to upload file(s)")
      } finally {
        setUploading(false)
        // Reset input
        if (inputRef.current) {
          inputRef.current.value = ""
        }
      }
    },
    [bucket, folder, maxSize, multiple, files, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (!disabled && !uploading) {
        handleFileSelect(e.dataTransfer.files)
      }
    },
    [disabled, uploading, handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleRemove = useCallback(
    async (urlToRemove: string) => {
      try {
        // Extract path from URL
        const url = new URL(urlToRemove)
        const path = url.pathname.split(`/storage/v1/object/public/${bucket}/`)[1]

        if (path) {
          const supabase = createClient()
          await supabase.storage.from(bucket).remove([path])
        }

        // Update state
        if (multiple) {
          onChange?.(files.filter((f) => f !== urlToRemove))
        } else {
          onChange?.("")
        }
        onRemove?.(urlToRemove)
        toast.success("File removed")
      } catch (error) {
        console.error("Remove error:", error)
        toast.error("Failed to remove file")
      }
    },
    [bucket, multiple, files, onChange, onRemove]
  )

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <div>
          <label className="text-sm font-medium">{label}</label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragOver && !disabled
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          uploading && "pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || uploading}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop {multiple ? "files" : "a file"} here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground">
              Max {maxSize}MB per file
            </p>
          </div>
        )}
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((url, index) => (
            <div
              key={url}
              className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30"
            >
              {/* Preview */}
              {showPreview && isImage(url) ? (
                <div className="h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`File ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                  {isImage(url) ? (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {url.split("/").pop() || `File ${index + 1}`}
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View file
                </a>
              </div>

              {/* Remove Button */}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={() => handleRemove(url)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Simplified single image upload with circular preview (for profile photos)
interface ProfilePhotoUploadProps {
  bucket: string
  folder?: string
  value?: string
  onChange?: (url: string) => void
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  placeholder?: string
}

export function ProfilePhotoUpload({
  bucket,
  folder = "",
  value,
  onChange,
  size = "md",
  disabled = false,
  placeholder,
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB")
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split(".").pop()
      const filename = `${timestamp}-${randomId}.${ext}`
      const path = folder ? `${folder}/${filename}` : filename

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      if (urlData?.publicUrl) {
        onChange?.(urlData.publicUrl)
        toast.success("Photo uploaded")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload photo")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled || uploading}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className={cn(
          "relative rounded-full overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/25 hover:border-primary transition-colors",
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Upload className="h-5 w-5" />
            <span className="text-xs mt-1">
              {placeholder || "Upload"}
            </span>
          </div>
        )}
      </button>

      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-red-600 hover:text-red-700"
          onClick={() => onChange?.("")}
        >
          Remove
        </Button>
      )}
    </div>
  )
}
