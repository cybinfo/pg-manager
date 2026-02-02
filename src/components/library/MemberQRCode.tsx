/**
 * Member QR Code Component
 *
 * Generates and displays a QR code for library member check-in.
 * The QR code contains a JSON payload with member details.
 */

"use client"

import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, QrCode } from "lucide-react"
import { useRef } from "react"

interface MemberQRCodeProps {
  memberId: string
  memberName: string
  memberCode: string | null
  libraryId: string
  size?: number
  showCard?: boolean
}

export function MemberQRCode({
  memberId,
  memberName,
  memberCode,
  libraryId,
  size = 200,
  showCard = true,
}: MemberQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  // Create QR code payload
  const qrPayload = JSON.stringify({
    type: "library_checkin",
    member_id: memberId,
    member_code: memberCode,
    library_id: libraryId,
    timestamp: Date.now(),
  })

  const handleDownload = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector("svg")
    if (!svg) return

    // Create canvas from SVG
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      const link = document.createElement("a")
      link.download = `qr-${memberCode || memberId.slice(0, 8)}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const qrContent = (
    <div className="flex flex-col items-center gap-4">
      <div ref={qrRef} className="bg-white p-4 rounded-lg">
        <QRCodeSVG
          value={qrPayload}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="font-medium">{memberName}</p>
        {memberCode && (
          <p className="text-sm text-muted-foreground font-mono">{memberCode}</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download QR
      </Button>
    </div>
  )

  if (!showCard) {
    return qrContent
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Check-in QR Code
        </CardTitle>
      </CardHeader>
      <CardContent>{qrContent}</CardContent>
    </Card>
  )
}

/**
 * Compact QR code for inline display
 */
export function MemberQRCodeCompact({
  memberId,
  memberCode,
  libraryId,
  size = 80,
}: Omit<MemberQRCodeProps, "memberName" | "showCard">) {
  const qrPayload = JSON.stringify({
    type: "library_checkin",
    member_id: memberId,
    member_code: memberCode,
    library_id: libraryId,
  })

  return (
    <div className="bg-white p-2 rounded border">
      <QRCodeSVG value={qrPayload} size={size} level="L" />
    </div>
  )
}
