"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import Cropper from "react-easy-crop"
import { X, ZoomIn, ZoomOut, RotateCw, Check } from "lucide-react"
import { Button } from "./button"

interface Point {
  x: number
  y: number
}

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperProps {
  image: string
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImage: Blob) => void
  aspectRatio?: number
  cropShape?: "rect" | "round"
}

// Create cropped image from canvas
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("No 2d context")
  }

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  )

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error("Canvas is empty"))
        }
      },
      "image/jpeg",
      0.9
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.crossOrigin = "anonymous"
    image.src = url
  })
}

export function ImageCropper({
  image,
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  cropShape = "round",
}: ImageCropperProps) {
  const [mounted, setMounted] = React.useState(false)
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const handleCropChange = (location: Point) => {
    setCrop(location)
  }

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
  }

  const handleCropAreaChange = (_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return

    setLoading(true)
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation)
      onCropComplete(croppedImage)
      onClose()
    } catch (error) {
      console.error("Error cropping image:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col bg-black"
      style={{ zIndex: 99999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Cancel"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold">Crop Photo</h2>
        <Button
          onClick={handleConfirm}
          disabled={loading}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Done
            </>
          )}
        </Button>
      </div>

      {/* Cropper Area */}
      <div className="relative flex-1">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspectRatio}
          cropShape={cropShape}
          showGrid={false}
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          onCropComplete={handleCropAreaChange}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-4 bg-gray-900 text-white">
        {/* Zoom slider */}
        <div className="flex items-center gap-4 mb-4">
          <ZoomOut className="h-5 w-5 text-gray-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <ZoomIn className="h-5 w-5 text-gray-400" />
        </div>

        {/* Rotate button */}
        <div className="flex justify-center">
          <button
            onClick={handleRotate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <RotateCw className="h-5 w-5" />
            Rotate
          </button>
        </div>

        {/* Instructions */}
        <p className="text-center text-sm text-gray-400 mt-4">
          Drag to reposition. Pinch or use slider to zoom.
        </p>
      </div>
    </div>,
    document.body
  )
}
