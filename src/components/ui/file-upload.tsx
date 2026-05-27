"use client"

import React, { useRef, useCallback } from "react"
import { Button } from "./button"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFileUpload } from "@/lib/hooks/useFileUpload"
import { useProfilePhotoUpload } from "@/lib/hooks/useProfilePhotoUpload"

interface FileUploadProps {
  bucket: string
  folder?: string
  accept?: string
  maxSize?: number
  multiple?: boolean
  value?: string | string[]
  onChange?: (urls: string | string[]) => void
  onRemove?: (url: string) => void
  label?: string
  description?: string
  className?: string
  showPreview?: boolean
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
  const inputRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const files = Array.isArray(value) ? value : value ? [value] : []

  const { uploading, handleFileSelect, handleRemove } = useFileUpload({
    bucket,
    folder,
    maxSize,
    multiple,
    files,
    onChange,
    onRemove,
  })

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled && !uploading) {
        handleFileSelect(e.dataTransfer.files)
      }
    },
    [disabled, uploading, handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const [dragOver, setDragOver] = React.useState(false)

  const handleDragOverWithState = useCallback((e: React.DragEvent) => {
    handleDragOver(e)
    setDragOver(true)
  }, [handleDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDropWithState = useCallback(
    (e: React.DragEvent) => {
      setDragOver(false)
      handleDrop(e)
    },
    [handleDrop]
  )

  const handleSelectAndReset = useCallback(
    async (selectedFiles: FileList | null) => {
      await handleFileSelect(selectedFiles)
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleFileSelect]
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
        onDrop={handleDropWithState}
        onDragOver={handleDragOverWithState}
        onDragLeave={handleDragLeave}
        role="button"
        aria-label={`Upload file${multiple ? 's' : ''}`}
        aria-describedby="file-upload-helper-text"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
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
          onChange={(e) => handleSelectAndReset(e.target.files)}
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
            <p id="file-upload-helper-text" className="text-xs text-muted-foreground">
              {accept === "image/*" ? "Accepted: images" : `Accepted: ${accept}`}. Max {maxSize}MB per file
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
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    uploading,
    selectedImage,
    cropperOpen,
    handleFileSelect,
    handleCropComplete,
    handleCropperClose,
  } = useProfilePhotoUpload({ bucket, folder, onChange })

  const handleSelectAndReset = useCallback(
    (files: FileList | null) => {
      handleFileSelect(files)
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleFileSelect]
  )

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const ImageCropper = React.lazy(() =>
    import("./image-cropper").then(mod => ({ default: mod.ImageCropper }))
  )

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled || uploading}
        onChange={(e) => handleSelectAndReset(e.target.files)}
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
          className="text-xs text-destructive hover:text-destructive/80"
          onClick={() => onChange?.("")}
        >
          Remove
        </Button>
      )}

      {selectedImage && (
        <React.Suspense fallback={null}>
          <ImageCropper
            image={selectedImage}
            isOpen={cropperOpen}
            onClose={handleCropperClose}
            onCropComplete={handleCropComplete}
            aspectRatio={1}
            cropShape="round"
          />
        </React.Suspense>
      )}
    </div>
  )
}
