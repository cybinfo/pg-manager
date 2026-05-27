"use client"

export async function compressImage(file: File, maxKB: number, maxDimension: number): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      // Drop quality iteratively until under limit; floor at 0.5 to avoid unacceptable degradation
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return }
            if (blob.size > maxKB * 1024 && quality > 0.5) {
              tryQuality(quality - 0.15)
            } else {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }))
            }
          },
          "image/jpeg",
          quality
        )
      }
      tryQuality(0.85)
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
