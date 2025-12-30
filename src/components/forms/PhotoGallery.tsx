"use client"

import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/ui/file-upload"
import { Image } from "lucide-react"

interface PhotoGalleryProps {
  /** Array of photo URLs */
  photos: string[]
  /** Callback when photos change */
  onChange: (photos: string[]) => void
  /** Label text */
  label?: string
  /** Description text */
  description?: string
  /** Maximum number of photos */
  maxPhotos?: number
  /** Storage bucket name */
  bucket: string
  /** Storage folder path */
  folder: string
  /** Whether the form is disabled */
  disabled?: boolean
  /** Photo thumbnail size in pixels */
  thumbnailSize?: number
}

/**
 * Photo gallery component with upload and preview.
 * Used for property photos, room photos, etc.
 */
export function PhotoGallery({
  photos,
  onChange,
  label = "Photos",
  description,
  maxPhotos = 10,
  bucket,
  folder,
  disabled = false,
  thumbnailSize = 80,
}: PhotoGalleryProps) {
  const handleRemovePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image className="h-4 w-4 text-muted-foreground" />
        <Label>{label}</Label>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <FileUpload
        bucket={bucket}
        folder={folder}
        value={photos}
        onChange={(urls) => {
          const urlArr = Array.isArray(urls) ? urls : urls ? [urls] : []
          onChange(urlArr.slice(0, maxPhotos))
        }}
        multiple
        accept="image/*"
      />
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img
                src={photo}
                alt={`Photo ${idx + 1}`}
                className="object-cover rounded-lg border"
                style={{ width: thumbnailSize, height: thumbnailSize }}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface CoverImageUploadProps {
  /** Cover image URL */
  value: string
  /** Callback when cover image changes */
  onChange: (url: string) => void
  /** Label text */
  label?: string
  /** Description text */
  description?: string
  /** Storage bucket name */
  bucket: string
  /** Storage folder path */
  folder: string
  /** Whether the form is disabled */
  disabled?: boolean
}

/**
 * Cover image upload component with preview.
 * Used for property cover image, etc.
 */
export function CoverImageUpload({
  value,
  onChange,
  label = "Cover Image",
  description,
  bucket,
  folder,
  disabled = false,
}: CoverImageUploadProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <FileUpload
        bucket={bucket}
        folder={folder}
        value={value}
        onChange={(url) => {
          const urlStr = Array.isArray(url) ? url[0] : url
          onChange(urlStr || "")
        }}
        accept="image/*"
      />
      {value && (
        <div className="mt-2 relative inline-block">
          <img
            src={value}
            alt="Cover preview"
            className="w-32 h-24 object-cover rounded-lg border"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}
