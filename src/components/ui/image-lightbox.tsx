"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface ImageLightboxProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = React.useState(false)

  // Only render portal on client side
  React.useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!isOpen || !mounted) return null

  // Use portal to render at document body level (above all other content)
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        aria-label="Close"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Image container - centered */}
      <div
        className="relative flex flex-col items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-[85vw] max-h-[80vh] object-contain rounded-lg shadow-2xl bg-white/5"
        />
        {/* Caption */}
        <p className="text-white text-center mt-4 text-base font-medium">{alt}</p>
        <p className="text-white/60 text-center mt-1 text-sm">Click outside or press ESC to close</p>
      </div>
    </div>,
    document.body
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
