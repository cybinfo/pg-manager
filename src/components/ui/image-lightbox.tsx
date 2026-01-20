"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageLightboxProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image container */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        {/* Caption */}
        <p className="text-white text-center mt-3 text-sm opacity-75">{alt}</p>
      </div>
    </div>
  )
}

// Hook to manage lightbox state
export function useLightbox() {
  const [lightbox, setLightbox] = React.useState<{
    isOpen: boolean
    src: string
    alt: string
  }>({
    isOpen: false,
    src: "",
    alt: "",
  })

  const openLightbox = React.useCallback((src: string, alt: string) => {
    setLightbox({ isOpen: true, src, alt })
  }, [])

  const closeLightbox = React.useCallback(() => {
    setLightbox((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return { lightbox, openLightbox, closeLightbox }
}
