"use client"

import { useState } from "react"
import { MessageCircle, Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateWhatsAppLink, copyToClipboard } from "@/lib/notifications"
import { showSuccess, showError } from "@/lib/toast-helpers"

interface WhatsAppButtonProps {
  phone: string
  message: string
  label?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showCopyButton?: boolean
}

export function WhatsAppButton({
  phone,
  message,
  label = "Send via WhatsApp",
  variant = "default",
  size = "default",
  className = "",
  showCopyButton = true,
}: WhatsAppButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleWhatsAppClick = () => {
    const url = generateWhatsAppLink(phone, message)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleCopyMessage = async () => {
    const success = await copyToClipboard(message)
    if (success) {
      setCopied(true)
      showSuccess("Message copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } else {
      showError("Failed to copy message")
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleWhatsAppClick}
        variant={variant}
        size={size}
        className={`bg-success hover:bg-success/90 text-white ${className}`}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {label}
        <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
      </Button>

      {showCopyButton && (
        <Button
          onClick={handleCopyMessage}
          variant="outline"
          size={size}
          className="px-3"
          title="Copy message"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

// Compact version for use in tables/lists
interface WhatsAppIconButtonProps {
  phone: string
  message: string
  className?: string
}

export function WhatsAppIconButton({
  phone,
  message,
  className = "",
}: WhatsAppIconButtonProps) {
  const handleClick = () => {
    const url = generateWhatsAppLink(phone, message)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="icon"
      className={`h-8 w-8 text-success hover:text-success hover:bg-success/10 ${className}`}
      title="Send via WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  )
}
